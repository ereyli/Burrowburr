use starknet::ContractAddress;
use starknet::storage::*;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use starknet::get_contract_address;
use core::num::traits::Zero;
use core::array::ArrayTrait;
use core::array::SpanTrait;

// IERC20 interface for interacting with STRK and BURR tokens
#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct Beaver {
    pub id: u64,
    pub beaver_type: u8, // 0 = Noob, 1 = Pro, 2 = Degen
    pub level: u8, // 1-5
    pub last_claim_time: u64,
    pub owner: ContractAddress,
}

#[derive(Copy, Drop, Serde)]
pub struct GameInfo {
    pub start_time: u64,
    pub end_time: u64,
    pub total_minted: u256,
    pub max_reward_pool: u256,
    pub is_ended: bool,
}

#[derive(Copy, Drop, Serde)]
pub struct StakingCosts {
    pub noob_cost: u256, // 50 STRK
    pub pro_cost: u256, // 120 STRK
    pub degen_cost: u256, // 350 STRK
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct GameAnalytics {
    pub total_beavers_staked: u64,
    pub total_burr_claimed: u256,
    pub total_strk_collected: u256,
    pub total_burr_burned: u256,
    pub noob_count: u64,
    pub pro_count: u64,
    pub degen_count: u64,
    pub active_users: u64,
    pub total_upgrades: u64,
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct UserStats {
    pub total_beavers: u64,
    pub total_claimed: u256,
    pub total_upgraded: u64,
    pub last_activity: u64,
}

#[starknet::interface]
pub trait IBurrowGameV3<TContractState> {
    // Core game functions
    fn stake_beaver(ref self: TContractState, beaver_type: u8);
    fn claim(ref self: TContractState);
    fn upgrade_beaver(ref self: TContractState, beaver_id: u64);
    fn burn_remaining(ref self: TContractState);
    
    // Migration functions
    fn import_beaver(ref self: TContractState, owner: ContractAddress, beaver_id: u64, beaver_type: u8, last_claim_time: u64);

    
    // Getter functions
    fn get_beaver(self: @TContractState, owner: ContractAddress, beaver_id: u64) -> Beaver;
    fn get_user_beavers(self: @TContractState, owner: ContractAddress) -> Array<u64>;
    fn get_user_last_claim(self: @TContractState, owner: ContractAddress) -> u64;
    fn calculate_pending_rewards(self: @TContractState, owner: ContractAddress) -> u256;
    fn get_game_info(self: @TContractState) -> GameInfo;
    fn is_game_ended(self: @TContractState) -> bool;
    
    // Token management
    fn set_burr_token(ref self: TContractState, token_address: ContractAddress);
    fn get_burr_token(self: @TContractState) -> ContractAddress;
    fn set_strk_token(ref self: TContractState, token_address: ContractAddress);
    fn get_strk_token(self: @TContractState) -> ContractAddress;
    fn get_staking_costs(self: @TContractState) -> StakingCosts;
    
    // Withdrawal functions
    fn withdraw_strk(ref self: TContractState, amount: u256);
    fn withdraw_burr(ref self: TContractState, amount: u256);
    fn get_contract_balances(self: @TContractState) -> (u256, u256);
    fn fund_burr_pool(ref self: TContractState, amount: u256);
    fn get_total_burned(self: @TContractState) -> u256;
    
    // Analytics functions
    fn get_game_analytics(self: @TContractState) -> GameAnalytics;
    fn get_user_stats(self: @TContractState, user: ContractAddress) -> UserStats;
    fn get_beaver_type_stats(self: @TContractState) -> (u64, u64, u64); // (noob, pro, degen)
    fn get_total_claimed_burr(self: @TContractState) -> u256;
    fn get_active_users_count(self: @TContractState) -> u64;
    
    // Emergency functions
    fn emergency_pause(ref self: TContractState);
    fn emergency_unpause(ref self: TContractState);
    fn get_emergency_status(self: @TContractState) -> bool;
    
    // Upgrade functions
    fn upgrade_max_pool(ref self: TContractState, new_max_pool: u256);
    fn get_max_pool(self: @TContractState) -> u256;
}

#[starknet::contract]
pub mod BurrowGameV3 {
    use starknet::ContractAddress;
    use starknet::storage::*;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;
    use starknet::get_contract_address;
    use core::num::traits::Zero;
    use core::array::ArrayTrait;
    use core::array::SpanTrait;
    use super::{Beaver, GameInfo, StakingCosts, GameAnalytics, UserStats, IERC20Dispatcher, IERC20DispatcherTrait};

    #[storage]
    pub struct Storage {
        // Core game state
        burr_token: ContractAddress,
        strk_token: ContractAddress,
        start_time: u64,
        total_minted: u256,
        max_reward_pool: u256,
        game_ended: bool,
        next_beaver_id: u64,
        owner: ContractAddress,
        
        // STRK staking costs (18 decimals)
        noob_staking_cost: u256,
        pro_staking_cost: u256,
        degen_staking_cost: u256,
        
        // BURR upgrade costs (18 decimals)
        noob_upgrade_cost: u256,
        pro_upgrade_cost: u256,
        degen_upgrade_cost: u256,
        
        // Burn tracking
        total_burned: u256,
        
        // User data
        user_beavers: Map<ContractAddress, Vec<u64>>,
        beavers: Map<u64, Beaver>,
        user_last_claim: Map<ContractAddress, u64>,
        
        // Security and rate limiting
        beaver_approvals: Map<u64, ContractAddress>,
        user_stake_cooldown: Map<ContractAddress, u64>,
        max_beavers_per_user: u64,
        stake_cooldown_duration: u64,
        admin: ContractAddress,
        emergency_paused: bool,
        
        // Analytics tracking (simplified)
        total_beavers_staked: u64,
        total_burr_claimed: u256,
        total_strk_collected: u256,
        total_burr_burned: u256,
        noob_count: u64,
        pro_count: u64,
        degen_count: u64,
        active_users: u64,
        total_upgrades: u64,
        beaver_type_counts: Map<u8, u64>, // 0=noob, 1=pro, 2=degen
        active_users_map: Map<ContractAddress, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        BeaverStaked: BeaverStaked,
        RewardsClaimed: RewardsClaimed,
        BeaverUpgraded: BeaverUpgraded,
        GameEnded: GameEnded,
        BurrTokenSet: BurrTokenSet,
        BeaverImported: BeaverImported,
        EmergencyPaused: EmergencyPaused,
        EmergencyUnpaused: EmergencyUnpaused,
        MaxPoolUpgraded: MaxPoolUpgraded,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BeaverStaked {
        #[key]
        pub owner: ContractAddress,
        pub beaver_id: u64,
        pub beaver_type: u8,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RewardsClaimed {
        #[key]
        pub owner: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BeaverUpgraded {
        #[key]
        pub owner: ContractAddress,
        pub beaver_id: u64,
        pub new_level: u8,
    }

    #[derive(Drop, starknet::Event)]
    pub struct GameEnded {
        pub end_time: u64,
        pub total_minted: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BurrTokenSet {
        pub token_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BeaverImported {
        #[key]
        pub owner: ContractAddress,
        pub beaver_id: u64,
        pub beaver_type: u8,
        pub last_claim_time: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct EmergencyPaused {
        pub paused_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct EmergencyUnpaused {
        pub unpaused_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MaxPoolUpgraded {
        pub old_max: u256,
        pub new_max: u256,
        pub upgraded_by: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        let current_time = get_block_timestamp();
        let max_pool: u256 = 2100000000_000000000000000000; // 2.1B BURR with 18 decimals
        
        self.start_time.write(current_time);
        self.total_minted.write(0);
        self.max_reward_pool.write(max_pool);
        self.game_ended.write(false);
        self.next_beaver_id.write(1);
        self.owner.write(owner);
        
        // Initialize STRK staking costs (18 decimals)
        self.noob_staking_cost.write(50_000000000000000000); // 50 STRK
        self.pro_staking_cost.write(120_000000000000000000); // 120 STRK
        self.degen_staking_cost.write(350_000000000000000000); // 350 STRK

        // Initialize BURR upgrade costs (18 decimals)
        self.noob_upgrade_cost.write(40000_000000000000000000); // 40K BURR per level
        self.pro_upgrade_cost.write(80000_000000000000000000); // 80K BURR per level
        self.degen_upgrade_cost.write(203000_000000000000000000); // 203K BURR per level
        
        // Initialize burn tracking
        self.total_burned.write(0);
        
        // Initialize rate limiting parameters
        self.max_beavers_per_user.write(10);
        self.stake_cooldown_duration.write(300); // 5 minutes
        self.admin.write(owner);
        self.emergency_paused.write(false);
        
        // Initialize analytics
        self.total_beavers_staked.write(0);
        self.total_burr_claimed.write(0);
        self.total_strk_collected.write(0);
        self.total_burr_burned.write(0);
        self.noob_count.write(0);
        self.pro_count.write(0);
        self.degen_count.write(0);
        self.active_users.write(0);
        self.total_upgrades.write(0);
        
        // Initialize beaver type counts
        self.beaver_type_counts.entry(0).write(0); // Noob
        self.beaver_type_counts.entry(1).write(0); // Pro
        self.beaver_type_counts.entry(2).write(0); // Degen
    }

    #[abi(embed_v0)]
    impl BurrowGameV3Impl of super::IBurrowGameV3<ContractState> {
        fn stake_beaver(ref self: ContractState, beaver_type: u8) {
            assert(beaver_type <= 2, 'Invalid beaver type');
            assert(!self._is_game_ended(), 'Game has ended');
            assert(!self.emergency_paused.read(), 'Contract is paused');
            
            let caller = get_caller_address();
            
            // Rate limiting checks
            let current_time = get_block_timestamp();
            let last_stake_time = self.user_stake_cooldown.entry(caller).read();
            let cooldown_duration = self.stake_cooldown_duration.read();
            
            if last_stake_time > 0 {
                assert(current_time >= last_stake_time + cooldown_duration, 'Stake cooldown active');
            }
            
            // Check maximum beavers per user
            let user_beaver_count = self.user_beavers.entry(caller).len();
            let max_beavers = self.max_beavers_per_user.read();
            assert(user_beaver_count < max_beavers, 'Max beavers per user reached');
            
            let strk_token_address = self.strk_token.read();
            assert(!strk_token_address.is_zero(), 'STRK token not set');
            
            // Calculate required STRK payment
            let strk_cost = self._get_staking_cost(beaver_type);
            
            // Check user's STRK balance
            let strk_dispatcher = IERC20Dispatcher { contract_address: strk_token_address };
            let user_balance = strk_dispatcher.balance_of(caller);
            assert(user_balance >= strk_cost, 'Insufficient STRK balance');
            
            // Transfer STRK from user to contract
            let contract_address = get_contract_address();
            let success = strk_dispatcher.transfer_from(caller, contract_address, strk_cost);
            assert(success, 'STRK payment failed');
            
            let beaver_id = self.next_beaver_id.read();
            
            // Create new beaver
            let new_beaver = Beaver {
                id: beaver_id,
                beaver_type,
                level: 1,
                last_claim_time: current_time,
                owner: caller,
            };
            
            // Store beaver
            self.beavers.entry(beaver_id).write(new_beaver);
            let mut vec = self.user_beavers.entry(caller);
            vec.push(beaver_id);
            self.next_beaver_id.write(beaver_id + 1);
            
            // Set user_last_claim if first time
            let existing_last_claim = self.user_last_claim.entry(caller).read();
            if existing_last_claim == 0 {
                self.user_last_claim.entry(caller).write(current_time);
            }
            
            // Update cooldown
            self.user_stake_cooldown.entry(caller).write(current_time);
            
            // Update analytics
            self._update_analytics_on_stake(caller, beaver_type, strk_cost);
            
            self.emit(Event::BeaverStaked(BeaverStaked {
                owner: caller,
                beaver_id,
                beaver_type,
            }));
        }

        fn claim(ref self: ContractState) {
            assert(!self._is_game_ended(), 'Game has ended');
            assert(!self.emergency_paused.read(), 'Contract is paused');
            
            let caller = get_caller_address();
            let pending_rewards = self._calculate_user_rewards(caller);
            
            assert(pending_rewards > 0, 'No rewards to claim');
            assert(self.total_minted.read() + pending_rewards <= self.max_reward_pool.read(), 'Would exceed max pool');
            
            // Update state BEFORE external call
            let current_time = get_block_timestamp();
            self.user_last_claim.entry(caller).write(current_time);
            
            // Update all user beavers' last claim time
            let user_beaver_count = self.user_beavers.entry(caller).len();
            for i in 0..user_beaver_count {
                let beaver_id = self.user_beavers.entry(caller).at(i).read();
                let mut beaver = self.beavers.entry(beaver_id).read();
                beaver.last_claim_time = current_time;
                self.beavers.entry(beaver_id).write(beaver);
            };
            
            // Update total minted BEFORE external call
            self.total_minted.write(self.total_minted.read() + pending_rewards);
            
            // Mint BURR tokens to user
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            let burr_dispatcher = IERC20Dispatcher { contract_address: burr_token_address };
            burr_dispatcher.mint(caller, pending_rewards);
            
            // Update analytics
            self._update_analytics_on_claim(caller, pending_rewards);
            
            self.emit(Event::RewardsClaimed(RewardsClaimed {
                owner: caller,
                amount: pending_rewards,
            }));
        }

        fn upgrade_beaver(ref self: ContractState, beaver_id: u64) {
            assert(!self._is_game_ended(), 'Game has ended');
            assert(!self.emergency_paused.read(), 'Contract is paused');
            
            let caller = get_caller_address();
            let mut beaver = self.beavers.entry(beaver_id).read();
            
            assert(beaver.owner == caller, 'Not beaver owner');
            assert(beaver.level < 5, 'Max level reached');
            
            // Calculate upgrade cost
            let upgrade_cost = self._calculate_upgrade_cost_by_type(beaver.beaver_type, beaver.level);
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            // Check user's BURR balance
            let burr_dispatcher = IERC20Dispatcher { contract_address: burr_token_address };
            let user_balance = burr_dispatcher.balance_of(caller);
            assert(user_balance >= upgrade_cost, 'Insufficient BURR balance');
            
            // Transfer BURR tokens from user to contract
            let contract_address = get_contract_address();
            let success = burr_dispatcher.transfer_from(caller, contract_address, upgrade_cost);
            assert(success, 'BURR payment failed');
            
            // Update total burned amount
            let current_burned = self.total_burned.read();
            self.total_burned.write(current_burned + upgrade_cost);
            
            // Update beaver level
            beaver.level += 1;
            self.beavers.entry(beaver_id).write(beaver);
            
            // Update analytics
            self._update_analytics_on_upgrade(caller, upgrade_cost);
            
            self.emit(Event::BeaverUpgraded(BeaverUpgraded {
                owner: caller,
                beaver_id,
                new_level: beaver.level,
            }));
        }

        fn import_beaver(ref self: ContractState, owner: ContractAddress, beaver_id: u64, beaver_type: u8, last_claim_time: u64) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can import');
            
            // Check if beaver already exists by trying to read it
            let existing_beaver = self.beavers.entry(beaver_id).read();
            assert(existing_beaver.id == 0, 'Already imported');
            
            let new_beaver = Beaver {
                id: beaver_id,
                beaver_type,
                level: 1,
                last_claim_time,
                owner,
            };
            
            self.beavers.entry(beaver_id).write(new_beaver);
            self.user_beavers.entry(owner).push(beaver_id);
            
            // Set user_last_claim only if not already set
            let existing_last_claim = self.user_last_claim.entry(owner).read();
            if existing_last_claim == 0 {
                self.user_last_claim.entry(owner).write(last_claim_time);
            }
            
            // Update analytics for imported beaver
            self._update_analytics_on_import(owner, beaver_type);
            
            self.emit(Event::BeaverImported(BeaverImported {
                owner,
                beaver_id,
                beaver_type,
                last_claim_time,
            }));
        }

        fn burn_remaining(ref self: ContractState) {
            assert(self._is_game_ended(), 'Game not ended yet');
            assert(!self.game_ended.read(), 'Already finalized');
            assert(!self.emergency_paused.read(), 'Contract is paused');
            
            self.game_ended.write(true);
            
            self.emit(Event::GameEnded(GameEnded {
                end_time: get_block_timestamp(),
                total_minted: self.total_minted.read(),
            }));
        }

        // Getter functions
        fn get_beaver(self: @ContractState, owner: ContractAddress, beaver_id: u64) -> Beaver {
            let beaver = self.beavers.entry(beaver_id).read();
            assert(beaver.owner == owner, 'Not beaver owner');
            beaver
        }

        fn get_user_beavers(self: @ContractState, owner: ContractAddress) -> Array<u64> {
            let mut result = array![];
            let user_beaver_count = self.user_beavers.entry(owner).len();
            
            for i in 0..user_beaver_count {
                result.append(self.user_beavers.entry(owner).at(i).read());
            };
            
            result
        }

        fn get_user_last_claim(self: @ContractState, owner: ContractAddress) -> u64 {
            self.user_last_claim.entry(owner).read()
        }

        fn calculate_pending_rewards(self: @ContractState, owner: ContractAddress) -> u256 {
            self._calculate_user_rewards(owner)
        }

        fn get_game_info(self: @ContractState) -> GameInfo {
            let start_time = self.start_time.read();
            GameInfo {
                start_time,
                end_time: start_time + 365 * 24 * 3600, // 365 days
                total_minted: self.total_minted.read(),
                max_reward_pool: self.max_reward_pool.read(),
                is_ended: self._is_game_ended(),
            }
        }

        fn is_game_ended(self: @ContractState) -> bool {
            self._is_game_ended()
        }

        // Token management
        fn set_burr_token(ref self: ContractState, token_address: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can set token');
            
            self.burr_token.write(token_address);
            self.emit(Event::BurrTokenSet(BurrTokenSet { token_address }));
        }

        fn get_burr_token(self: @ContractState) -> ContractAddress {
            self.burr_token.read()
        }

        fn set_strk_token(ref self: ContractState, token_address: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can set token');
            
            self.strk_token.write(token_address);
            self.emit(Event::BurrTokenSet(BurrTokenSet { token_address }));
        }

        fn get_strk_token(self: @ContractState) -> ContractAddress {
            self.strk_token.read()
        }

        fn get_staking_costs(self: @ContractState) -> StakingCosts {
            StakingCosts {
                noob_cost: self.noob_staking_cost.read(),
                pro_cost: self.pro_staking_cost.read(),
                degen_cost: self.degen_staking_cost.read(),
            }
        }

        // Withdrawal functions
        fn withdraw_strk(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can withdraw');
            
            let strk_token_address = self.strk_token.read();
            assert(!strk_token_address.is_zero(), 'STRK token not set');
            
            let strk_dispatcher = IERC20Dispatcher { contract_address: strk_token_address };
            let contract_address = get_contract_address();
            let contract_balance = strk_dispatcher.balance_of(contract_address);
            assert(contract_balance >= amount, 'Insufficient contract balance');
            
            let success = strk_dispatcher.transfer(caller, amount);
            assert(success, 'STRK withdrawal failed');
        }

        fn withdraw_burr(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can withdraw');
            
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            let burr_dispatcher = IERC20Dispatcher { contract_address: burr_token_address };
            let contract_address = get_contract_address();
            let contract_balance = burr_dispatcher.balance_of(contract_address);
            assert(contract_balance >= amount, 'Insufficient contract balance');
            
            let success = burr_dispatcher.transfer(caller, amount);
            assert(success, 'BURR withdrawal failed');
        }

        fn get_contract_balances(self: @ContractState) -> (u256, u256) {
            let contract_address = get_contract_address();
            
            let strk_balance = if !self.strk_token.read().is_zero() {
                let strk_dispatcher = IERC20Dispatcher { contract_address: self.strk_token.read() };
                strk_dispatcher.balance_of(contract_address)
            } else {
                0
            };
            
            let burr_balance = if !self.burr_token.read().is_zero() {
                let burr_dispatcher = IERC20Dispatcher { contract_address: self.burr_token.read() };
                burr_dispatcher.balance_of(contract_address)
            } else {
                0
            };
            
            (strk_balance, burr_balance)
        }

        fn fund_burr_pool(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can fund pool');
            
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            let burr_dispatcher = IERC20Dispatcher { contract_address: burr_token_address };
            let contract_address = get_contract_address();
            
            let owner_balance = burr_dispatcher.balance_of(caller);
            assert(owner_balance >= amount, 'Insufficient owner BURR');
            
            let success = burr_dispatcher.transfer_from(caller, contract_address, amount);
            assert(success, 'BURR funding failed');
        }

        fn get_total_burned(self: @ContractState) -> u256 {
            self.total_burned.read()
        }

        // Analytics functions
        fn get_game_analytics(self: @ContractState) -> GameAnalytics {
            GameAnalytics {
                total_beavers_staked: self.total_beavers_staked.read(),
                total_burr_claimed: self.total_burr_claimed.read(),
                total_strk_collected: self.total_strk_collected.read(),
                total_burr_burned: self.total_burr_burned.read(),
                noob_count: self.noob_count.read(),
                pro_count: self.pro_count.read(),
                degen_count: self.degen_count.read(),
                active_users: self.active_users.read(),
                total_upgrades: self.total_upgrades.read(),
            }
        }

        fn get_user_stats(self: @ContractState, user: ContractAddress) -> UserStats {
            let total_beavers = self.user_beavers.entry(user).len();
            let last_activity = self.user_last_claim.entry(user).read();
            
            // For now, return basic stats - these can be enhanced later
            UserStats {
                total_beavers,
                total_claimed: 0, // Would need additional storage to track per-user claims
                total_upgraded: 0, // Would need additional storage to track per-user upgrades
                last_activity,
            }
        }

        fn get_beaver_type_stats(self: @ContractState) -> (u64, u64, u64) {
            (
                self.noob_count.read(), // Noob
                self.pro_count.read(), // Pro
                self.degen_count.read(), // Degen
            )
        }

        fn get_total_claimed_burr(self: @ContractState) -> u256 {
            self.total_burr_claimed.read()
        }

        fn get_active_users_count(self: @ContractState) -> u64 {
            self.active_users.read()
        }

        // Emergency functions
        fn emergency_pause(ref self: ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can pause');
            self.emergency_paused.write(true);
            self.emit(Event::EmergencyPaused(EmergencyPaused { paused_by: caller }));
        }

        fn emergency_unpause(ref self: ContractState) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can unpause');
            self.emergency_paused.write(false);
            self.emit(Event::EmergencyUnpaused(EmergencyUnpaused { unpaused_by: caller }));
        }

        fn get_emergency_status(self: @ContractState) -> bool {
            self.emergency_paused.read()
        }

        // Upgrade functions
        fn upgrade_max_pool(ref self: ContractState, new_max_pool: u256) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can upgrade pool');
            assert(new_max_pool > self.max_reward_pool.read(), 'New pool must be larger');
            
            let old_max = self.max_reward_pool.read();
            self.max_reward_pool.write(new_max_pool);
            
            self.emit(Event::MaxPoolUpgraded(MaxPoolUpgraded {
                old_max,
                new_max: new_max_pool,
                upgraded_by: caller,
            }));
        }

        fn get_max_pool(self: @ContractState) -> u256 {
            self.max_reward_pool.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _is_game_ended(self: @ContractState) -> bool {
            let current_time = get_block_timestamp();
            let start_time = self.start_time.read();
            let game_duration = 365 * 24 * 3600; // 365 days in seconds
            
            current_time >= start_time + game_duration || self.game_ended.read()
        }

        fn _calculate_user_rewards(self: @ContractState, owner: ContractAddress) -> u256 {
            let user_beaver_count = self.user_beavers.entry(owner).len();
            if user_beaver_count == 0 {
                return 0;
            }
            
            let current_time = get_block_timestamp();
            let last_claim = self.user_last_claim.entry(owner).read();
            if last_claim == 0 {
                return 0;
            }
            
            // Safe time difference calculation
            let time_diff = if current_time > last_claim {
                current_time - last_claim
            } else {
                0
            };
            
            // Limit maximum time difference to prevent overflow
            let max_time_diff: u64 = 365 * 24 * 3600; // 1 year max
            let safe_time_diff = if time_diff > max_time_diff {
                max_time_diff
            } else {
                time_diff
            };
            
            let mut total_rewards: u256 = 0;
            
            for i in 0..user_beaver_count {
                let beaver_id = self.user_beavers.entry(owner).at(i).read();
                let beaver = self.beavers.entry(beaver_id).read();
                
                let base_hourly_reward = self._get_base_hourly_reward(beaver.beaver_type);
                let level_multiplier = self._get_level_multiplier(beaver.level);
                
                let beaver_hourly_reward = (base_hourly_reward * level_multiplier) / 1000;
                let beaver_per_second_reward = beaver_hourly_reward / 3600;
                
                let beaver_rewards = if safe_time_diff > 0 {
                    beaver_per_second_reward * safe_time_diff.into()
                } else {
                    0
                };
                
                total_rewards += beaver_rewards;
            };
            
            total_rewards
        }

        fn _get_base_hourly_reward(self: @ContractState, beaver_type: u8) -> u256 {
            if beaver_type == 0 { // Noob
                300_000000000000000000 // 300 BURR per hour
            } else if beaver_type == 1 { // Pro
                750_000000000000000000 // 750 BURR per hour
            } else { // Degen
                2250_000000000000000000 // 2,250 BURR per hour
            }
        }

        fn _get_level_multiplier(self: @ContractState, level: u8) -> u256 {
            if level == 1 { 1000 }      // 1.0x
            else if level == 2 { 1500 } // 1.5x
            else if level == 3 { 2250 } // 2.25x
            else if level == 4 { 3375 } // 3.375x
            else { 5062 }               // 5.0625x (level 5)
        }

        fn _calculate_upgrade_cost_by_type(self: @ContractState, beaver_type: u8, current_level: u8) -> u256 {
            let base_cost = if beaver_type == 0 { // Noob
                self.noob_upgrade_cost.read() // 40K BURR per level
            } else if beaver_type == 1 { // Pro
                self.pro_upgrade_cost.read() // 80K BURR per level
            } else { // Degen
                self.degen_upgrade_cost.read() // 203K BURR per level
            };
            
            if current_level <= 2 {
                base_cost
            } else {
                base_cost * 2
            }
        }

        fn _get_staking_cost(self: @ContractState, beaver_type: u8) -> u256 {
            if beaver_type == 0 { // Noob
                self.noob_staking_cost.read()
            } else if beaver_type == 1 { // Pro
                self.pro_staking_cost.read()
            } else { // Degen
                self.degen_staking_cost.read()
            }
        }

        // Analytics update functions
        fn _update_analytics_on_stake(ref self: ContractState, user: ContractAddress, beaver_type: u8, strk_cost: u256) {
            // Update total beavers staked
            let current_total = self.total_beavers_staked.read();
            self.total_beavers_staked.write(current_total + 1);
            
            // Update total STRK collected
            let current_strk = self.total_strk_collected.read();
            self.total_strk_collected.write(current_strk + strk_cost);
            
            // Update beaver type count
            let current_count = self.beaver_type_counts.entry(beaver_type).read();
            self.beaver_type_counts.entry(beaver_type).write(current_count + 1);
            
            // Update specific type counts
            if beaver_type == 0 {
                let current_noob = self.noob_count.read();
                self.noob_count.write(current_noob + 1);
            } else if beaver_type == 1 {
                let current_pro = self.pro_count.read();
                self.pro_count.write(current_pro + 1);
            } else if beaver_type == 2 {
                let current_degen = self.degen_count.read();
                self.degen_count.write(current_degen + 1);
            }
            
            // Update active users
            let is_active = self.active_users_map.entry(user).read();
            if !is_active {
                let current_active = self.active_users.read();
                self.active_users.write(current_active + 1);
                self.active_users_map.entry(user).write(true);
            }
        }

        fn _update_analytics_on_claim(ref self: ContractState, user: ContractAddress, claimed_amount: u256) {
            // Update total BURR claimed
            let current_claimed = self.total_burr_claimed.read();
            self.total_burr_claimed.write(current_claimed + claimed_amount);
        }

        fn _update_analytics_on_upgrade(ref self: ContractState, user: ContractAddress, burned_amount: u256) {
            // Update total BURR burned
            let current_burned = self.total_burr_burned.read();
            self.total_burr_burned.write(current_burned + burned_amount);
            
            // Update total upgrades
            let current_upgrades = self.total_upgrades.read();
            self.total_upgrades.write(current_upgrades + 1);
        }

        fn _update_analytics_on_import(ref self: ContractState, user: ContractAddress, beaver_type: u8) {
            // Update total beavers staked
            let current_total = self.total_beavers_staked.read();
            self.total_beavers_staked.write(current_total + 1);
            
            // Update beaver type count
            let current_count = self.beaver_type_counts.entry(beaver_type).read();
            self.beaver_type_counts.entry(beaver_type).write(current_count + 1);
            
            // Update specific type counts
            if beaver_type == 0 {
                let current_noob = self.noob_count.read();
                self.noob_count.write(current_noob + 1);
            } else if beaver_type == 1 {
                let current_pro = self.pro_count.read();
                self.pro_count.write(current_pro + 1);
            } else if beaver_type == 2 {
                let current_degen = self.degen_count.read();
                self.degen_count.write(current_degen + 1);
            }
            
            // Update active users
            let is_active = self.active_users_map.entry(user).read();
            if !is_active {
                let current_active = self.active_users.read();
                self.active_users.write(current_active + 1);
                self.active_users_map.entry(user).write(true);
            }
        }
    }
}