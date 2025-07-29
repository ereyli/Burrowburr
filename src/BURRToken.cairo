use starknet::ContractAddress;

#[starknet::interface]
pub trait IBURRToken<TContractState> {
    fn name(self: @TContractState) -> ByteArray;
    fn symbol(self: @TContractState) -> ByteArray;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
    fn burn_from(ref self: TContractState, from: ContractAddress, amount: u256);
    fn authorize_minter(ref self: TContractState, minter: ContractAddress);
    fn revoke_minter(ref self: TContractState, minter: ContractAddress);
    fn is_authorized_minter(self: @TContractState, minter: ContractAddress) -> bool;
    fn owner(self: @TContractState) -> ContractAddress;
    
    // camelCase fonksiyonlar - cüzdanlar için gerekli
    fn totalSupply(self: @TContractState) -> u256;
    fn balanceOf(self: @TContractState, account: ContractAddress) -> u256;
    fn transferFrom(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
}

#[starknet::contract]
pub mod BURRToken {
    use starknet::ContractAddress;
    use starknet::storage::*;
    use starknet::get_caller_address;
    use core::num::traits::Zero;
    
    #[storage]
    pub struct Storage {
        name: ByteArray,
        symbol: ByteArray,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
        owner: ContractAddress,
        authorized_minters: Map<ContractAddress, bool>,
        total_supply_cap: u256,
    }
    
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Transfer: Transfer,
        Approval: Approval,
        MinterAuthorized: MinterAuthorized,
        MinterRevoked: MinterRevoked,
    }
    
    #[derive(Drop, starknet::Event)]
    pub struct Transfer {
        #[key]
        pub from: ContractAddress,
        #[key]
        pub to: ContractAddress,
        pub value: u256,
    }
    
    #[derive(Drop, starknet::Event)]
    pub struct Approval {
        #[key]
        pub owner: ContractAddress,
        #[key]
        pub spender: ContractAddress,
        pub value: u256,
    }
    
    #[derive(Drop, starknet::Event)]
    pub struct MinterAuthorized {
        #[key]
        pub minter: ContractAddress,
    }
    
    #[derive(Drop, starknet::Event)]
    pub struct MinterRevoked {
        #[key]
        pub minter: ContractAddress,
    }
    
    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.name.write("Burrow");
        self.symbol.write("BURR");
        self.decimals.write(18);
        self.total_supply.write(0);
        self.owner.write(owner);
        self.total_supply_cap.write(2100000000_000000000000000000); // 2.1 billion BURR
        
        // Authorize owner as initial minter
        self.authorized_minters.entry(owner).write(true);
        self.emit(Event::MinterAuthorized(MinterAuthorized { minter: owner }));
    }
    
    #[abi(embed_v0)]
    impl BURRTokenImpl of super::IBURRToken<ContractState> {
        fn name(self: @ContractState) -> ByteArray {
            self.name.read()
        }
        
        fn symbol(self: @ContractState) -> ByteArray {
            self.symbol.read()
        }
        
        fn decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }
        
        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }
        
        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.entry(account).read()
        }
        
        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.entry((owner, spender)).read()
        }
        
        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            self._transfer(caller, recipient, amount);
            true
        }
        
        fn transfer_from(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            let current_allowance = self.allowances.entry((sender, caller)).read();
            assert(current_allowance >= amount, 'Insufficient allowance');
            
            self.allowances.entry((sender, caller)).write(current_allowance - amount);
            self._transfer(sender, recipient, amount);
            true
        }
        
        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            self.allowances.entry((caller, spender)).write(amount);
            
            self.emit(Event::Approval(Approval {
                owner: caller,
                spender,
                value: amount,
            }));
            true
        }
        
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            assert(self.authorized_minters.entry(caller).read(), 'Not authorized to mint');
            
            let current_supply = self.total_supply.read();
            let new_supply = current_supply + amount;
            assert(new_supply <= self.total_supply_cap.read(), 'Exceeds supply cap');
            
            self.total_supply.write(new_supply);
            let current_balance = self.balances.entry(to).read();
            self.balances.entry(to).write(current_balance + amount);
            
            let zero_address: ContractAddress = Zero::zero();
            self.emit(Event::Transfer(Transfer {
                from: zero_address,
                to,
                value: amount,
            }));
        }
        
        fn burn_from(ref self: ContractState, from: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            
            // Check allowance if not burning own tokens
            if caller != from {
                let current_allowance = self.allowances.entry((from, caller)).read();
                assert(current_allowance >= amount, 'Insufficient allowance');
                self.allowances.entry((from, caller)).write(current_allowance - amount);
            }
            
            let current_balance = self.balances.entry(from).read();
            assert(current_balance >= amount, 'Insufficient balance');
            
            self.balances.entry(from).write(current_balance - amount);
            self.total_supply.write(self.total_supply.read() - amount);
            
            let zero_address: ContractAddress = Zero::zero();
            self.emit(Event::Transfer(Transfer {
                from,
                to: zero_address,
                value: amount,
            }));
        }
        
        fn authorize_minter(ref self: ContractState, minter: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can authorize');
            
            self.authorized_minters.entry(minter).write(true);
            self.emit(Event::MinterAuthorized(MinterAuthorized { minter }));
        }
        
        fn revoke_minter(ref self: ContractState, minter: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can revoke');
            
            self.authorized_minters.entry(minter).write(false);
            self.emit(Event::MinterRevoked(MinterRevoked { minter }));
        }
        
        fn is_authorized_minter(self: @ContractState, minter: ContractAddress) -> bool {
            self.authorized_minters.entry(minter).read()
        }
        
        fn owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }
        
        fn totalSupply(self: @ContractState) -> u256 {
            self.total_supply()
        }
        
        fn balanceOf(self: @ContractState, account: ContractAddress) -> u256 {
            self.balance_of(account)
        }
        
        fn transferFrom(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
            self.transfer_from(sender, recipient, amount)
        }
    }
    
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256) {
            assert(!from.is_zero(), 'Transfer from zero address');
            assert(!to.is_zero(), 'Transfer to zero address');
            
            let from_balance = self.balances.entry(from).read();
            assert(from_balance >= amount, 'Insufficient balance');
            
            self.balances.entry(from).write(from_balance - amount);
            let to_balance = self.balances.entry(to).read();
            self.balances.entry(to).write(to_balance + amount);
            
            self.emit(Event::Transfer(Transfer {
                from,
                to,
                value: amount,
            }));
        }
    }
} 