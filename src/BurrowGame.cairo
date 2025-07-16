use starknet::ContractAddress;

// IERC20 interface for interacting with STRK token
#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256); // For BURR token
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct Beaver {
    pub id: u64,
    pub beaver_type: u8, // 0 = Noob, 1 = Pro, 2 = Degen
    pub level: u8,       // 1-5
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
    pub noob_cost: u256,    // 50 STRK
    pub pro_cost: u256,     // 120 STRK
    pub degen_cost: u256,   // 350 STRK
}

#[starknet::interface]
pub trait IBurrowGame<TContractState> {
    fn stake_beaver(ref self: TContractState, beaver_type: u8);
    fn claim(ref self: TContractState);
    fn upgrade_beaver(ref self: TContractState, beaver_id: u64);
    fn burn_remaining(ref self: TContractState);
    fn get_beaver(self: @TContractState, owner: ContractAddress, beaver_id: u64) -> Beaver;
    fn get_user_beavers(self: @TContractState, owner: ContractAddress) -> Array<u64>;
    fn get_user_last_claim(self: @TContractState, owner: ContractAddress) -> u64;
    fn calculate_pending_rewards(self: @TContractState, owner: ContractAddress) -> u256;
    fn get_game_info(self: @TContractState) -> GameInfo;
    fn is_game_ended(self: @TContractState) -> bool;
    fn set_burr_token(ref self: TContractState, token_address: ContractAddress);
    fn get_burr_token(self: @TContractState) -> ContractAddress;
    fn set_strk_token(ref self: TContractState, token_address: ContractAddress);
    fn get_strk_token(self: @TContractState) -> ContractAddress;
    fn get_staking_costs(self: @TContractState) -> StakingCosts;
    fn withdraw_strk(ref self: TContractState, amount: u256);
    fn withdraw_burr(ref self: TContractState, amount: u256);
    fn get_contract_balances(self: @TContractState) -> (u256, u256); // returns (STRK, BURR)
    fn fund_burr_pool(ref self: TContractState, amount: u256); // Add BURR tokens to contract pool
    fn get_total_burned(self: @TContractState) -> u256; // Get total BURR burned from upgrades
}

#[starknet::contract]
pub mod BurrowGame {
    use starknet::ContractAddress;
    use starknet::storage::*;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;
    use starknet::get_contract_address;
    use core::num::traits::Zero;
    use super::{Beaver, GameInfo, StakingCosts, IERC20Dispatcher, IERC20DispatcherTrait};
    
    #[storage]
    pub struct Storage {
        burr_token: ContractAddress,
        strk_token: ContractAddress,
        start_time: u64,
        total_minted: u256,
        max_reward_pool: u256,
        game_ended: bool,
        next_beaver_id: u64,
        owner: ContractAddress,
        
        // STRK staking costs (stored with 18 decimals) - Updated prices
        noob_staking_cost: u256,
        pro_staking_cost: u256,
        degen_staking_cost: u256,
        
        // BURR upgrade costs (stored with 18 decimals) - Updated costs
        noob_upgrade_cost: u256,
        pro_upgrade_cost: u256,
        degen_upgrade_cost: u256,
        
        // Burn tracking
        total_burned: u256,
        
        // User data
        user_beavers: Map<ContractAddress, Vec<u64>>,
        beavers: Map<u64, Beaver>,
        user_last_claim: Map<ContractAddress, u64>,
    }
    
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        BeaverStaked: BeaverStaked,
        RewardsClaimed: RewardsClaimed,
        BeaverUpgraded: BeaverUpgraded,
        GameEnded: GameEnded,
        BurrTokenSet: BurrTokenSet,
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
    
    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        let current_time = get_block_timestamp();
        let max_pool: u256 = 700000000_000000000000000000; // 700 million BURR with 18 decimals
        
        self.start_time.write(current_time);
        self.total_minted.write(0);
        self.max_reward_pool.write(max_pool);
        self.game_ended.write(false);
        self.next_beaver_id.write(1);
        self.owner.write(owner);
        
        // Initialize STRK staking costs (18 decimals) - NEW PRICES
        self.noob_staking_cost.write(50_000000000000000000); // 50 STRK
        self.pro_staking_cost.write(120_000000000000000000);  // 120 STRK
        self.degen_staking_cost.write(350_000000000000000000); // 350 STRK

        // Initialize BURR upgrade costs (18 decimals) - NEW PROGRESSION
        // Noob total: 200K BURR (40K + 80K + 80K = 200K)
        // Pro total: 400K BURR (80K + 160K + 160K = 400K)  
        // Degen total: 1.015M BURR (203K + 406K + 406K = 1.015M)
        self.noob_upgrade_cost.write(40000_000000000000000000); // 40K BURR per level
        self.pro_upgrade_cost.write(80000_000000000000000000);  // 80K BURR per level
        self.degen_upgrade_cost.write(203000_000000000000000000); // 203K BURR per level
        
        // Initialize burn tracking
        self.total_burned.write(0);
    }
    
    #[abi(embed_v0)]
    impl BurrowGameImpl of super::IBurrowGame<ContractState> {
        fn stake_beaver(ref self: ContractState, beaver_type: u8) {
            // Validate beaver type (0=Noob, 1=Pro, 2=Degen)
            assert(beaver_type <= 2, 'Invalid beaver type');
            assert(!self._is_game_ended(), 'Game has ended');
            
            let caller = get_caller_address();
            let strk_token_address = self.strk_token.read();
            assert(!strk_token_address.is_zero(), 'STRK token not set');
            
            // Calculate required STRK payment
            let strk_cost = self._get_staking_cost(beaver_type);
            
            // Check user's STRK balance
            let strk_dispatcher = IERC20Dispatcher { contract_address: strk_token_address };
            let user_balance = strk_dispatcher.balance_of(caller);
            assert(user_balance >= strk_cost, 'Insufficient STRK balance');
            
            // Transfer STRK from user to contract (accumulates for later withdrawal)
            let contract_address = get_contract_address();
            let success = strk_dispatcher.transfer_from(caller, contract_address, strk_cost);
            assert(success, 'STRK payment failed');
            
            let current_time = get_block_timestamp();
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
            
            // CRITICAL FIX: Only set user_last_claim if user has no previous claim time
            // This preserves accumulated rewards for existing users
            let existing_last_claim = self.user_last_claim.entry(caller).read();
            if existing_last_claim == 0 {
                // First-time staker: set initial claim time
                self.user_last_claim.entry(caller).write(current_time);
            }
            // For existing users: DO NOT update user_last_claim to preserve accumulated rewards
            
            self.emit(Event::BeaverStaked(BeaverStaked {
                owner: caller,
                beaver_id,
                beaver_type,
            }));
        }
        
        fn claim(ref self: ContractState) {
            assert(!self._is_game_ended(), 'Game has ended');
            
            let caller = get_caller_address();
            let pending_rewards = self._calculate_user_rewards(caller);
            
            assert(pending_rewards > 0, 'No rewards to claim');
            assert(self.total_minted.read() + pending_rewards <= self.max_reward_pool.read(), 'Would exceed max pool');
            
            // Update claim times
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
            
            // Update total minted
            self.total_minted.write(self.total_minted.read() + pending_rewards);
            
            // Mint BURR tokens directly to user (correct approach)
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            let burr_dispatcher = IERC20Dispatcher { contract_address: burr_token_address };
            
            // Mint new BURR tokens to user
            burr_dispatcher.mint(caller, pending_rewards);
            
            self.emit(Event::RewardsClaimed(RewardsClaimed {
                owner: caller,
                amount: pending_rewards,
            }));
        }
        
        fn upgrade_beaver(ref self: ContractState, beaver_id: u64) {
            assert(!self._is_game_ended(), 'Game has ended');
            
            let caller = get_caller_address();
            let mut beaver = self.beavers.entry(beaver_id).read();
            
            assert(beaver.owner == caller, 'Not beaver owner');
            assert(beaver.level < 5, 'Max level reached');
            
            // Calculate upgrade cost based on beaver type and current level
            let upgrade_cost = self._calculate_upgrade_cost_by_type(beaver.beaver_type, beaver.level);
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            // Check user's BURR balance
            let burr_dispatcher = IERC20Dispatcher { contract_address: burr_token_address };
            let user_balance = burr_dispatcher.balance_of(caller);
            assert(user_balance >= upgrade_cost, 'Insufficient BURR balance');
            
            // Transfer BURR tokens from user to contract (accumulates for later withdrawal)
            let contract_address = get_contract_address();
            let success = burr_dispatcher.transfer_from(caller, contract_address, upgrade_cost);
            assert(success, 'BURR payment failed');
            
            // Update total burned amount
            let current_burned = self.total_burned.read();
            self.total_burned.write(current_burned + upgrade_cost);
            
            // CRITICAL BUG FIX: DO NOT update beaver.last_claim_time during upgrade
            // This preserves pending rewards that were accumulated before the upgrade
            // Only update the level
            beaver.level += 1;
            self.beavers.entry(beaver_id).write(beaver);
            
            self.emit(Event::BeaverUpgraded(BeaverUpgraded {
                owner: caller,
                beaver_id,
                new_level: beaver.level,
            }));
        }
        
        fn burn_remaining(ref self: ContractState) {
            assert(self._is_game_ended(), 'Game not ended yet');
            assert(!self.game_ended.read(), 'Already finalized');
            
            self.game_ended.write(true);
            
            self.emit(Event::GameEnded(GameEnded {
                end_time: get_block_timestamp(),
                total_minted: self.total_minted.read(),
            }));
        }
        
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

        fn withdraw_strk(ref self: ContractState, amount: u256) {
            // Only owner can withdraw
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can withdraw');
            
            let strk_token_address = self.strk_token.read();
            assert(!strk_token_address.is_zero(), 'STRK token not set');
            
            // Check contract's STRK balance
            let strk_dispatcher = IERC20Dispatcher { contract_address: strk_token_address };
            let contract_address = get_contract_address();
            let contract_balance = strk_dispatcher.balance_of(contract_address);
            assert(contract_balance >= amount, 'Insufficient contract balance');
            
            // Transfer STRK from contract to owner
            let success = strk_dispatcher.transfer(caller, amount);
            assert(success, 'STRK withdrawal failed');
        }

        fn withdraw_burr(ref self: ContractState, amount: u256) {
            // Only owner can withdraw
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can withdraw');
            
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            // Check contract's BURR balance
            let burr_dispatcher = IERC20Dispatcher { contract_address: burr_token_address };
            let contract_address = get_contract_address();
            let contract_balance = burr_dispatcher.balance_of(contract_address);
            assert(contract_balance >= amount, 'Insufficient contract balance');
            
            // Transfer BURR from contract to owner
            let success = burr_dispatcher.transfer(caller, amount);
            assert(success, 'BURR withdrawal failed');
        }

        fn fund_burr_pool(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can fund pool');
            
            let burr_token_address = self.burr_token.read();
            assert(!burr_token_address.is_zero(), 'BURR token not set');
            
            let burr_dispatcher = IERC20Dispatcher { contract_address: burr_token_address };
            let contract_address = get_contract_address();
            
            // Check if owner has enough BURR tokens
            let owner_balance = burr_dispatcher.balance_of(caller);
            assert(owner_balance >= amount, 'Insufficient owner BURR');
            
            // Transfer BURR tokens from owner to contract (funding the pool)
            let success = burr_dispatcher.transfer_from(caller, contract_address, amount);
            assert(success, 'BURR funding failed');
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

        fn get_total_burned(self: @ContractState) -> u256 {
            self.total_burned.read()
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
            
            let time_diff = current_time - last_claim;
            let mut total_rewards: u256 = 0;
            
            for i in 0..user_beaver_count {
                let beaver_id = self.user_beavers.entry(owner).at(i).read();
                let beaver = self.beavers.entry(beaver_id).read();
                
                let base_hourly_reward = self._get_base_hourly_reward(beaver.beaver_type);
                let level_multiplier = self._get_level_multiplier(beaver.level);
                
                // Calculate hourly reward for this beaver
                let beaver_hourly_reward = (base_hourly_reward * level_multiplier) / 1000; // level_multiplier is in basis points
                
                // Calculate reward for time period (per second basis to avoid integer division issues)
                let beaver_per_second_reward = beaver_hourly_reward / 3600; // Reward per second
                let beaver_rewards = beaver_per_second_reward * time_diff.into();
                
                total_rewards += beaver_rewards;
            };
            
            total_rewards
        }
        
        fn _get_base_hourly_reward(self: @ContractState, beaver_type: u8) -> u256 {
            // UPDATED BASE HOURLY REWARDS with 18 decimals (3x increased)
            if beaver_type == 0 { // Noob
                300_000000000000000000 // 300 BURR per hour (3x from 100)
            } else if beaver_type == 1 { // Pro
                750_000000000000000000 // 750 BURR per hour (3x from 250)
            } else { // Degen
                2250_000000000000000000 // 2,250 BURR per hour (3x from 750)
            }
        }
        
        fn _get_level_multiplier(self: @ContractState, level: u8) -> u256 {
            // Each level increases reward by 1.5x (multipliers in basis points)
            if level == 1 { 1000 }      // 1.0x
            else if level == 2 { 1500 } // 1.5x
            else if level == 3 { 2250 } // 2.25x
            else if level == 4 { 3375 } // 3.375x
            else { 5062 }               // 5.0625x (level 5)
        }
        
        fn _calculate_upgrade_cost(self: @ContractState, current_level: u8) -> u256 {
            // OLD FUNCTION - DEPRECATED - Use _calculate_upgrade_cost_by_type instead
            // Upgrade costs with 18 decimals (exponential growth)
            if current_level == 1 { 1000_000000000000000000 }   // 1,000 BURR
            else if current_level == 2 { 2500_000000000000000000 } // 2,500 BURR
            else if current_level == 3 { 6250_000000000000000000 } // 6,250 BURR
            else { 15625_000000000000000000 }                      // 15,625 BURR
        }

        fn _calculate_upgrade_cost_by_type(self: @ContractState, beaver_type: u8, current_level: u8) -> u256 {
            // NEW UPGRADE COST SYSTEM - Based on beaver type
            let base_cost = if beaver_type == 0 { // Noob
                self.noob_upgrade_cost.read() // 40K BURR per level
            } else if beaver_type == 1 { // Pro
                self.pro_upgrade_cost.read() // 80K BURR per level
            } else { // Degen
                self.degen_upgrade_cost.read() // 203K BURR per level
            };

            // First two levels cost the same, levels 3-4 cost double
            if current_level <= 2 {
                base_cost // 40K, 80K, 203K respectively
            } else {
                base_cost * 2 // 80K, 160K, 406K respectively for levels 3-4
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
    }
} 