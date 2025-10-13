use starknet::ContractAddress;
use starknet::storage::*;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use core::num::traits::Zero;

// Interface for BURR token interaction
#[starknet::interface]
pub trait IBURRToken<TContractState> {
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
}

// Staking position structure
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct StakingPosition {
    pub amount: u256, // Active staking amount (earning rewards)
    pub start_time: u64,
    pub last_claim_time: u64,
    pub reward_rate: u256, // Rewards per second per token (with 18 decimals)
}

// Unstaking request structure (for 30-day delay)
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct UnstakeRequest {
    pub amount: u256, // Amount waiting to be withdrawn
    pub request_time: u64, // When unstake was requested
    pub withdrawal_time: u64, // When tokens can be withdrawn (request_time + 30 days)
}

// Reward token configuration
#[derive(Drop, Serde, starknet::Store)]
pub struct RewardToken {
    pub address: ContractAddress,
    pub symbol: ByteArray,
    pub decimals: u8,
    pub is_active: bool,
    pub reward_rate: u256, // Reward rate for this token
}

// Staking pool information
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct StakingPool {
    pub total_staked: u256,
    pub total_rewards_distributed: u256,
    pub reward_rate: u256, // Base reward rate per second per token
    pub is_active: bool,
    pub created_at: u64,
    pub use_multi_token: bool, // Whether to use multi-token rewards
}

// Main staking contract interface
#[starknet::interface]
pub trait IBURRStaking<TContractState> {
    // Core staking functions
    fn stake(ref self: TContractState, amount: u256);
    fn unstake(ref self: TContractState, amount: u256);
    fn claim_rewards(ref self: TContractState);
    fn claim_and_unstake(ref self: TContractState, amount: u256);
    
    // View functions
    fn get_staking_position(self: @TContractState, user: ContractAddress) -> StakingPosition;
    fn get_pending_rewards(self: @TContractState, user: ContractAddress) -> u256;
    fn get_staking_pool_info(self: @TContractState) -> StakingPool;
    fn get_total_staked(self: @TContractState) -> u256;
    fn get_user_staked_amount(self: @TContractState, user: ContractAddress) -> u256;
    fn withdraw_unstaked(ref self: TContractState);
    fn get_unstake_request(self: @TContractState, user: ContractAddress) -> (u256, u64, u64);
    fn get_reward_pool_balance(self: @TContractState) -> u256;
    
    // Admin functions
    fn set_burr_token(ref self: TContractState, token_address: ContractAddress);
    fn set_reward_rate(ref self: TContractState, new_rate: u256);
    fn update_user_reward_rate(ref self: TContractState, user: ContractAddress, new_rate: u256);
    fn pause_staking(ref self: TContractState);
    fn unpause_staking(ref self: TContractState);
    fn emergency_withdraw(ref self: TContractState, amount: u256);
    fn fund_rewards(ref self: TContractState, amount: u256);
    
    // Multi-token reward functions
    fn add_reward_token(ref self: TContractState, token_id: u8, token_address: ContractAddress, symbol: ByteArray, decimals: u8, reward_rate: u256);
    fn remove_reward_token(ref self: TContractState, token_id: u8);
    fn set_reward_token_rate(ref self: TContractState, token_id: u8, new_rate: u256);
    fn enable_multi_token_rewards(ref self: TContractState);
    fn disable_multi_token_rewards(ref self: TContractState);
    fn get_reward_token(self: @TContractState, token_id: u8) -> RewardToken;
    fn is_multi_token_enabled(self: @TContractState) -> bool;
    
    // Owner functions
    fn transfer_ownership(ref self: TContractState, new_owner: ContractAddress);
    fn get_owner(self: @TContractState) -> ContractAddress;
    fn get_burr_token(self: @TContractState) -> ContractAddress;
    fn set_contract_address(ref self: TContractState, address: ContractAddress);
}

#[starknet::contract]
pub mod BURRStaking {
    use starknet::ContractAddress;
    use starknet::storage::*;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;
    use core::num::traits::Zero;
    use super::{StakingPosition, UnstakeRequest, StakingPool, RewardToken, IBURRTokenDispatcher, IBURRTokenDispatcherTrait};

    #[storage]
    pub struct Storage {
        // Core contract state
        burr_token: ContractAddress,
        owner: ContractAddress,
        admin: ContractAddress,
        contract_address: ContractAddress,
        
        // Staking pool state
        staking_pool: StakingPool,
        
        // User staking data
        user_positions: Map<ContractAddress, StakingPosition>,
        user_unstake_requests: Map<ContractAddress, UnstakeRequest>,
        
        // Multi-token reward system
        reward_tokens: Map<u8, RewardToken>,
        next_token_id: u8,
        
        // Emergency controls
        is_paused: bool,
        
        // Reentrancy guard - prevents double claiming
        claiming_in_progress: Map<ContractAddress, bool>,
        
        // Separate reward pool balance from staked amounts
        reward_pool_balance: u256,
        
        // Reward tracking
        total_rewards_funded: u256,
        total_rewards_claimed: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        TokensStaked: TokensStaked,
        TokensUnstaked: TokensUnstaked,
        RewardsClaimed: RewardsClaimed,
        RewardRateUpdated: RewardRateUpdated,
        StakingPaused: StakingPaused,
        StakingUnpaused: StakingUnpaused,
        OwnershipTransferred: OwnershipTransferred,
        BurrTokenSet: BurrTokenSet,
        RewardsFunded: RewardsFunded,
        EmergencyWithdrawal: EmergencyWithdrawal,
        RewardTokenAdded: RewardTokenAdded,
        RewardTokenRemoved: RewardTokenRemoved,
        RewardTokenRateUpdated: RewardTokenRateUpdated,
        MultiTokenEnabled: MultiTokenEnabled,
        MultiTokenDisabled: MultiTokenDisabled,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TokensStaked {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TokensUnstaked {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RewardsClaimed {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RewardRateUpdated {
        pub old_rate: u256,
        pub new_rate: u256,
        pub updated_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct StakingPaused {
        pub paused_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct StakingUnpaused {
        pub unpaused_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct OwnershipTransferred {
        pub old_owner: ContractAddress,
        pub new_owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BurrTokenSet {
        pub token_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RewardsFunded {
        pub amount: u256,
        pub funded_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct EmergencyWithdrawal {
        pub amount: u256,
        pub withdrawn_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RewardTokenAdded {
        pub token_id: u8,
        pub token_address: ContractAddress,
        pub symbol: ByteArray,
        pub reward_rate: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RewardTokenRemoved {
        pub token_id: u8,
        pub token_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RewardTokenRateUpdated {
        pub token_id: u8,
        pub old_rate: u256,
        pub new_rate: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MultiTokenEnabled {
        pub enabled_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MultiTokenDisabled {
        pub disabled_by: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, admin: ContractAddress) {
        let current_time = get_block_timestamp();
        
        self.owner.write(owner);
        self.admin.write(admin);
        self.is_paused.write(false);
        // Contract address will be set after deployment
        self.contract_address.write(Zero::zero());
        
        // Initialize staking pool with default reward rate
        // Default: 50% APY (15844043906 wei per second)
        let default_reward_rate: u256 = 15844043906; // 50% APY
        
        let initial_pool = StakingPool {
            total_staked: 0,
            total_rewards_distributed: 0,
            reward_rate: default_reward_rate,
            is_active: true,
            created_at: current_time,
            use_multi_token: false, // Start with single token mode
        };
        
        self.staking_pool.write(initial_pool);
        self.total_rewards_funded.write(0);
        self.total_rewards_claimed.write(0);
        self.next_token_id.write(0);
        
        // CRITICAL: Initialize new security variables
        self.reward_pool_balance.write(0); // Separate reward pool starts at 0
    }

    #[abi(embed_v0)]
    impl BURRStakingImpl of super::IBURRStaking<ContractState> {
        fn stake(ref self: ContractState, amount: u256) {
            assert(!self.is_paused.read(), 'Staking is paused');
            assert(amount > 0, 'Amount must be greater than 0');
            
            let caller = get_caller_address();
            assert(!caller.is_zero(), 'Invalid caller address');
            
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            // Check user's BURR balance
            let burr_dispatcher = IBURRTokenDispatcher { contract_address: burr_token_address };
            let user_balance = burr_dispatcher.balance_of(caller);
            assert(user_balance >= amount, 'Insufficient BURR balance');
            
            let current_time = get_block_timestamp();
            
            // CRITICAL: NO AUTO-CLAIMING ON STAKE
            // User must manually claim rewards - this prevents unwanted automatic claims
            
            // Get or create user position FIRST (CEI Pattern - Effects before Interactions)
            let mut position = self.user_positions.entry(caller).read();
            
            if position.amount > 0 {
                // Update existing position - NO automatic claiming
                // Just update the last_claim_time to current time for new stake calculation
                position.amount += amount;
                // Keep original last_claim_time to preserve pending rewards
            } else {
                // Create new position
                position = StakingPosition {
                    amount,
                    start_time: current_time,
                    last_claim_time: current_time,
                    reward_rate: self.staking_pool.read().reward_rate,
                };
            }
            
            // Update user position
            self.user_positions.entry(caller).write(position);
            
            // CRITICAL: Staked amounts are separate from reward pool
            // Only update total_staked, NOT the reward pool balance
            let mut pool = self.staking_pool.read();
            pool.total_staked += amount;
            self.staking_pool.write(pool);
            
            // INTERACTIONS: External call AFTER state updates (CEI Pattern)
            let contract_address = self.contract_address.read();
            let success = burr_dispatcher.transfer_from(caller, contract_address, amount);
            assert(success, 'BURR transfer failed');
            
            self.emit(Event::TokensStaked(TokensStaked {
                user: caller,
                amount,
                timestamp: current_time,
            }));
        }

        fn unstake(ref self: ContractState, amount: u256) {
            assert(!self.is_paused.read(), 'Staking is paused');
            assert(amount > 0, 'Amount must be greater than 0');
            
            let caller = get_caller_address();
            assert(!caller.is_zero(), 'Invalid caller address');
            
            let mut position = self.user_positions.entry(caller).read();
            
            assert(position.amount >= amount, 'Insufficient staked amount');
            
            let current_time = get_block_timestamp();
            
            // CRITICAL: NO AUTO-CLAIMING ON UNSTAKE
            // User must manually claim rewards before or after unstaking
            // This prevents unwanted automatic claims and gives user control
            
            // CHECKS-EFFECTS-INTERACTIONS PATTERN:
            
            // 1. EFFECTS: Update state FIRST
            // Update position (remove from staking, stops earning rewards immediately)
            position.amount -= amount;
            // Keep last_claim_time unchanged to preserve pending rewards calculation
            
            // Update pool total (remove from total staked)
            let mut pool = self.staking_pool.read();
            pool.total_staked -= amount;
            self.staking_pool.write(pool);
            
            // Create unstake request with 30-day delay (no rewards during delay)
            let withdrawal_time = current_time + (30 * 24 * 60 * 60); // 30 days from now
            let mut unstake_request = self.user_unstake_requests.entry(caller).read();
            
            // Add to existing unstake request or create new one
            unstake_request.amount += amount;
            unstake_request.request_time = current_time;
            unstake_request.withdrawal_time = withdrawal_time;
            
            self.user_unstake_requests.entry(caller).write(unstake_request);
            
            if position.amount == 0 {
                // Remove position if fully unstaked
                self.user_positions.entry(caller).write(StakingPosition {
                    amount: 0,
                    start_time: 0,
                    last_claim_time: 0,
                    reward_rate: 0,
                });
            } else {
                // Save updated position
                self.user_positions.entry(caller).write(position);
            }
            
            // Event emission removed for now - can be added later
        }

        fn claim_rewards(ref self: ContractState) {
            let caller = get_caller_address();
            
            // CRITICAL: Check paused state first
            assert(!self.is_paused.read(), 'Contract is paused');
            
            // CRITICAL: Reentrancy guard - prevent double claiming
            assert(!self.claiming_in_progress.entry(caller).read(), 'Claim already in progress');
            self.claiming_in_progress.entry(caller).write(true);
            
            let position = self.user_positions.entry(caller).read();
            assert(position.amount > 0, 'No staked tokens');
            
            let pending_rewards = self._calculate_pending_rewards(caller, position);
            assert(pending_rewards > 0, 'No rewards to claim');
            
            // CRITICAL: Check reward pool has enough balance
            let current_reward_pool = self.reward_pool_balance.read();
            assert(current_reward_pool >= pending_rewards, 'Insufficient reward pool');
            
            // CHECKS-EFFECTS-INTERACTIONS PATTERN:
            
            // 1. EFFECTS: Update state BEFORE external calls
            // Reset pending rewards immediately to prevent double claiming
            let mut updated_position = position;
            updated_position.last_claim_time = get_block_timestamp();
            self.user_positions.entry(caller).write(updated_position);
            
            // Update reward pool balance
            self.reward_pool_balance.write(current_reward_pool - pending_rewards);
            
            // Update total claimed
            let total_claimed = self.total_rewards_claimed.read();
            self.total_rewards_claimed.write(total_claimed + pending_rewards);
            
            // 2. INTERACTIONS: External calls LAST
            self._transfer_rewards(caller, pending_rewards);
            
            // Clear reentrancy guard AFTER successful transfer
            self.claiming_in_progress.entry(caller).write(false);
            
            self.emit(Event::RewardsClaimed(RewardsClaimed {
                user: caller,
                amount: pending_rewards,
                timestamp: get_block_timestamp(),
            }));
        }

        fn claim_and_unstake(ref self: ContractState, amount: u256) {
            // REMOVED: No longer auto-claiming
            // Users must manually claim rewards if they want them
            // This gives users full control over when to claim
            
            // Just unstake - no automatic claiming
            self.unstake(amount);
        }

        // View functions
        fn get_staking_position(self: @ContractState, user: ContractAddress) -> StakingPosition {
            self.user_positions.entry(user).read()
        }

        fn get_pending_rewards(self: @ContractState, user: ContractAddress) -> u256 {
            let position = self.user_positions.entry(user).read();
            if position.amount == 0 {
                return 0;
            }
            
            self._calculate_pending_rewards(user, position)
        }

        fn get_staking_pool_info(self: @ContractState) -> StakingPool {
            self.staking_pool.read()
        }

        fn get_total_staked(self: @ContractState) -> u256 {
            self.staking_pool.read().total_staked
        }

        fn get_user_staked_amount(self: @ContractState, user: ContractAddress) -> u256 {
            self.user_positions.entry(user).read().amount
        }

        fn withdraw_unstaked(ref self: ContractState) {
            let caller = get_caller_address();
            let unstake_request = self.user_unstake_requests.entry(caller).read();
            
            assert(unstake_request.amount > 0, 'No unstaked tokens to withdraw');
            
            let current_time = get_block_timestamp();
            assert(current_time >= unstake_request.withdrawal_time, 'Withdrawal not yet available');
            
            let amount_to_withdraw = unstake_request.amount;
            
            // Clear the unstake request
            self.user_unstake_requests.entry(caller).write(UnstakeRequest {
                amount: 0,
                request_time: 0,
                withdrawal_time: 0,
            });
            
            // Transfer BURR tokens back to user
            let burr_token_address = self.burr_token.read();
            let burr_dispatcher = IBURRTokenDispatcher { contract_address: burr_token_address };
            let success = burr_dispatcher.transfer(caller, amount_to_withdraw);
            assert(success, 'BURR transfer failed');
            
            // Event emission removed for now - can be added later
        }

        fn get_unstake_request(self: @ContractState, user: ContractAddress) -> (u256, u64, u64) {
            let request = self.user_unstake_requests.entry(user).read();
            (request.amount, request.request_time, request.withdrawal_time)
        }


        fn get_reward_pool_balance(self: @ContractState) -> u256 {
            // CRITICAL: Return the actual reward pool balance
            // This is separate from staked amounts and only includes funds added via fund_rewards
            self.reward_pool_balance.read()
        }

        // Admin functions
        fn set_burr_token(ref self: ContractState, token_address: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can set token');
            
            self.burr_token.write(token_address);
            self.emit(Event::BurrTokenSet(BurrTokenSet { token_address }));
        }

        fn set_reward_rate(ref self: ContractState, new_rate: u256) {
            let caller = get_caller_address();
            assert(caller == self.admin.read() || caller == self.owner.read(), 'Only admin or owner');
            
            let mut pool = self.staking_pool.read();
            let old_rate = pool.reward_rate;
            pool.reward_rate = new_rate;
            self.staking_pool.write(pool);
            
            self.emit(Event::RewardRateUpdated(RewardRateUpdated {
                old_rate,
                new_rate,
                updated_by: caller,
            }));
        }

        fn update_user_reward_rate(ref self: ContractState, user: ContractAddress, new_rate: u256) {
            let caller = get_caller_address();
            assert(caller == self.admin.read() || caller == self.owner.read(), 'Only admin or owner');
            
            let mut position = self.user_positions.entry(user).read();
            assert(position.amount > 0, 'User has no staking position');
            
            let old_rate = position.reward_rate;
            position.reward_rate = new_rate;
            self.user_positions.entry(user).write(position);
            
            self.emit(Event::RewardRateUpdated(RewardRateUpdated {
                old_rate,
                new_rate,
                updated_by: caller,
            }));
        }

        fn pause_staking(ref self: ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read() || caller == self.owner.read(), 'Only admin or owner');
            
            self.is_paused.write(true);
            self.emit(Event::StakingPaused(StakingPaused { paused_by: caller }));
        }

        fn unpause_staking(ref self: ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read() || caller == self.owner.read(), 'Only admin or owner');
            
            self.is_paused.write(false);
            self.emit(Event::StakingUnpaused(StakingUnpaused { unpaused_by: caller }));
        }

        fn emergency_withdraw(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can withdraw');
            
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            let burr_dispatcher = IBURRTokenDispatcher { contract_address: burr_token_address };
            let contract_address = self.contract_address.read();
            let contract_balance = burr_dispatcher.balance_of(contract_address);
            assert(contract_balance >= amount, 'Insufficient contract balance');
            
            let success = burr_dispatcher.transfer(caller, amount);
            assert(success, 'Emergency withdrawal failed');
            
            self.emit(Event::EmergencyWithdrawal(EmergencyWithdrawal {
                amount,
                withdrawn_by: caller,
            }));
        }

        fn fund_rewards(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can fund rewards');
            
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            let burr_dispatcher = IBURRTokenDispatcher { contract_address: burr_token_address };
            
            let owner_balance = burr_dispatcher.balance_of(caller);
            assert(owner_balance >= amount, 'Insufficient owner BURR balance');
            
            let contract_address = self.contract_address.read();
            let success = burr_dispatcher.transfer_from(caller, contract_address, amount);
            assert(success, 'BURR funding failed');
            
            // CRITICAL: Add to reward pool balance (separate from staked amounts)
            let current_reward_pool = self.reward_pool_balance.read();
            self.reward_pool_balance.write(current_reward_pool + amount);
            
            // Track total funded for transparency
            let current_funded = self.total_rewards_funded.read();
            self.total_rewards_funded.write(current_funded + amount);
            
            self.emit(Event::RewardsFunded(RewardsFunded {
                amount,
                funded_by: caller,
            }));
        }

        // Owner functions
        fn transfer_ownership(ref self: ContractState, new_owner: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can transfer');
            assert(!new_owner.is_zero(), 'New owner cannot be zero');
            
            let old_owner = self.owner.read();
            self.owner.write(new_owner);
            
            self.emit(Event::OwnershipTransferred(OwnershipTransferred {
                old_owner,
                new_owner,
            }));
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn get_burr_token(self: @ContractState) -> ContractAddress {
            self.burr_token.read()
        }

        fn set_contract_address(ref self: ContractState, address: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can set address');
            self.contract_address.write(address);
        }

        // Multi-token reward functions
        fn add_reward_token(ref self: ContractState, token_id: u8, token_address: ContractAddress, symbol: ByteArray, decimals: u8, reward_rate: u256) {
            let caller = get_caller_address();
            assert(caller == self.admin.read() || caller == self.owner.read(), 'Only admin or owner');
            assert(!token_address.is_zero(), 'Invalid token address');
            
            let reward_token = RewardToken {
                address: token_address,
                symbol: symbol.clone(),
                decimals,
                is_active: true,
                reward_rate,
            };
            
            self.reward_tokens.entry(token_id).write(reward_token);
            
            self.emit(Event::RewardTokenAdded(RewardTokenAdded {
                token_id,
                token_address,
                symbol: symbol.clone(),
                reward_rate,
            }));
        }

        fn remove_reward_token(ref self: ContractState, token_id: u8) {
            let caller = get_caller_address();
            assert(caller == self.admin.read() || caller == self.owner.read(), 'Only admin or owner');
            
            let reward_token = self.reward_tokens.entry(token_id).read();
            assert(reward_token.is_active, 'Token not found');
            
            let updated_token = RewardToken {
                address: reward_token.address,
                symbol: reward_token.symbol.clone(),
                decimals: reward_token.decimals,
                is_active: false,
                reward_rate: reward_token.reward_rate,
            };
            self.reward_tokens.entry(token_id).write(updated_token);
            
            self.emit(Event::RewardTokenRemoved(RewardTokenRemoved {
                token_id,
                token_address: reward_token.address,
            }));
        }

        fn set_reward_token_rate(ref self: ContractState, token_id: u8, new_rate: u256) {
            let caller = get_caller_address();
            assert(caller == self.admin.read() || caller == self.owner.read(), 'Only admin or owner');
            
            let reward_token = self.reward_tokens.entry(token_id).read();
            assert(reward_token.is_active, 'Token not found');
            
            let old_rate = reward_token.reward_rate;
            let updated_token = RewardToken {
                address: reward_token.address,
                symbol: reward_token.symbol.clone(),
                decimals: reward_token.decimals,
                is_active: reward_token.is_active,
                reward_rate: new_rate,
            };
            self.reward_tokens.entry(token_id).write(updated_token);
            
            self.emit(Event::RewardTokenRateUpdated(RewardTokenRateUpdated {
                token_id,
                old_rate,
                new_rate,
            }));
        }

        fn enable_multi_token_rewards(ref self: ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read() || caller == self.owner.read(), 'Only admin or owner');
            
            let mut pool = self.staking_pool.read();
            pool.use_multi_token = true;
            self.staking_pool.write(pool);
            
            self.emit(Event::MultiTokenEnabled(MultiTokenEnabled { enabled_by: caller }));
        }

        fn disable_multi_token_rewards(ref self: ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read() || caller == self.owner.read(), 'Only admin or owner');
            
            let mut pool = self.staking_pool.read();
            pool.use_multi_token = false;
            self.staking_pool.write(pool);
            
            self.emit(Event::MultiTokenDisabled(MultiTokenDisabled { disabled_by: caller }));
        }

        fn get_reward_token(self: @ContractState, token_id: u8) -> RewardToken {
            self.reward_tokens.entry(token_id).read()
        }

        fn is_multi_token_enabled(self: @ContractState) -> bool {
            self.staking_pool.read().use_multi_token
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _calculate_pending_rewards(self: @ContractState, user: ContractAddress, position: StakingPosition) -> u256 {
            if position.amount == 0 {
                return 0;
            }
            
            let current_time = get_block_timestamp();
            
            // Protection against timestamp manipulation
            assert(current_time >= position.last_claim_time, 'Invalid timestamp detected');
            
            let time_elapsed = current_time - position.last_claim_time;
            
            if time_elapsed == 0 {
                return 0;
            }
            
            // Calculate rewards: amount * time_elapsed * reward_rate with overflow protection
            // Use intermediate calculations to prevent overflow
            let time_elapsed_u256: u256 = time_elapsed.into();
            let intermediate = position.amount * time_elapsed_u256;
            
            // Check for potential overflow before multiplication
            assert(intermediate / position.amount == time_elapsed_u256, 'Overflow in time calculation');
            
            let rewards_before_division = intermediate * position.reward_rate;
            
            // Check for overflow in reward calculation
            assert(rewards_before_division / intermediate == position.reward_rate, 'Overflow in reward calculation');
            
            let rewards = rewards_before_division / 1000000000000000000; // 18 decimals
            
            rewards
        }

        fn _transfer_rewards(ref self: ContractState, user: ContractAddress, amount: u256) {
            let pool = self.staking_pool.read();
            
            if pool.use_multi_token {
                // Multi-token mode: distribute rewards across all active tokens
                self._transfer_multi_token_rewards(user, amount);
            } else {
                // Single token mode: use BURR token from contract balance
                let burr_token_address = self.burr_token.read();
                let burr_dispatcher = IBURRTokenDispatcher { contract_address: burr_token_address };
                
                // Check if contract has enough balance for rewards
                let contract_address = self.contract_address.read();
                let contract_balance = burr_dispatcher.balance_of(contract_address);
                assert(contract_balance >= amount, 'Insufficient reward pool');
                
                // Transfer rewards from contract to user (not mint new tokens)
                let success = burr_dispatcher.transfer(user, amount);
                assert(success, 'Reward transfer failed');
            }
            
            // Update tracking
            let current_claimed = self.total_rewards_claimed.read();
            self.total_rewards_claimed.write(current_claimed + amount);
            
            let mut pool = self.staking_pool.read();
            pool.total_rewards_distributed += amount;
            self.staking_pool.write(pool);
        }

        fn _transfer_multi_token_rewards(ref self: ContractState, user: ContractAddress, total_amount: u256) {
            // For now, distribute equally among all active tokens
            // This can be enhanced with custom distribution logic
            let mut active_tokens = 0;
            
            // Count active tokens (simplified approach)
            // In a real implementation, you'd track active tokens differently
            let mut i = 0;
            while i < 10 { // Limit to first 10 tokens for gas efficiency
                let token = self.reward_tokens.entry(i).read();
                if token.is_active {
                    active_tokens += 1;
                }
                i += 1;
            }
            
            if active_tokens != 0 {
                let amount_per_token = total_amount / active_tokens.into();
                
                // Distribute to each active token
                let mut i = 0;
                while i < 10 { // Limit to first 10 tokens for gas efficiency
                    let token = self.reward_tokens.entry(i).read();
                    if token.is_active {
                        let token_dispatcher = IBURRTokenDispatcher { contract_address: token.address };
                        token_dispatcher.mint(user, amount_per_token);
                    }
                    i += 1;
                }
            }
        }
    }
}
