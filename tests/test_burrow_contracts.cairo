use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};
use burrowgame::BURRToken::{IBURRTokenDispatcher, IBURRTokenDispatcherTrait};
use burrowgame::BurrowGame::{IBurrowGameDispatcher, IBurrowGameDispatcherTrait, StakingCosts};

fn deploy_mock_strk_token(owner: ContractAddress) -> ContractAddress {
    // Use BURR token as mock STRK for testing
    let burr_contract = declare("BURRToken").unwrap().contract_class();
    let (strk_address, _) = burr_contract.deploy(@array![owner.into()]).unwrap();
    
    // Mint some mock STRK tokens for testing
    let strk_dispatcher = IBURRTokenDispatcher { contract_address: strk_address };
    start_cheat_caller_address(strk_address, owner);
    strk_dispatcher.authorize_minter(owner);
    strk_dispatcher.mint(owner, 1000_000000000000000000); // 1000 mock STRK
    stop_cheat_caller_address(strk_address);
    
    strk_address
}

#[test]
fn test_burr_token_deployment() {
    // Deploy BURR token
    let burr_contract = declare("BURRToken").unwrap().contract_class();
    let owner: ContractAddress = 0x123.try_into().unwrap();
    let (burr_address, _) = burr_contract.deploy(@array![owner.into()]).unwrap();
    
    // Test token properties
    let burr_dispatcher = IBURRTokenDispatcher { contract_address: burr_address };
    
    assert(burr_dispatcher.name() == "Burrow", 'Wrong token name');
    assert(burr_dispatcher.symbol() == "BURR", 'Wrong token symbol');
    assert(burr_dispatcher.decimals() == 18, 'Wrong decimals');
    assert(burr_dispatcher.total_supply() == 0, 'Should start with 0 supply');
    assert(burr_dispatcher.owner() == owner, 'Wrong owner');
}

#[test]
fn test_burrow_game_deployment() {
    // Deploy BurrowGame
    let game_contract = declare("BurrowGame").unwrap().contract_class();
    let owner: ContractAddress = 0x123.try_into().unwrap();
    let (game_address, _) = game_contract.deploy(@array![owner.into()]).unwrap();
    
    // Test game properties
    let game_dispatcher = IBurrowGameDispatcher { contract_address: game_address };
    
    let game_info = game_dispatcher.get_game_info();
    assert(game_info.max_reward_pool == 700000000_000000000000000000, 'Wrong max reward pool');
    assert(!game_info.is_ended, 'Game should not be ended');
    assert(game_info.total_minted == 0, 'Should start with 0 minted');
    
    // Test staking costs
    let costs = game_dispatcher.get_staking_costs();
    assert(costs.noob_cost == 12_000000000000000000, 'Wrong Noob cost');
    assert(costs.pro_cost == 30_000000000000000000, 'Wrong Pro cost');
    assert(costs.degen_cost == 60_000000000000000000, 'Wrong Degen cost');
}

#[test]
fn test_strk_token_setup() {
    // Deploy BurrowGame and mock STRK
    let game_contract = declare("BurrowGame").unwrap().contract_class();
    let owner: ContractAddress = 0x123.try_into().unwrap();
    let (game_address, _) = game_contract.deploy(@array![owner.into()]).unwrap();
    
    let strk_address = deploy_mock_strk_token(owner);
    
    let game_dispatcher = IBurrowGameDispatcher { contract_address: game_address };
    
    // Set STRK token address
    start_cheat_caller_address(game_address, owner);
    game_dispatcher.set_strk_token(strk_address);
    stop_cheat_caller_address(game_address);
    
    assert(game_dispatcher.get_strk_token() == strk_address, 'Wrong STRK address');
}

#[test]
fn test_beaver_staking_with_strk() {
    // Deploy contracts
    let game_contract = declare("BurrowGame").unwrap().contract_class();
    let owner: ContractAddress = 0x123.try_into().unwrap();
    let user: ContractAddress = 0x456.try_into().unwrap();
    let (game_address, _) = game_contract.deploy(@array![owner.into()]).unwrap();
    
    let strk_address = deploy_mock_strk_token(owner);
    let strk_dispatcher = IBURRTokenDispatcher { contract_address: strk_address };
    let game_dispatcher = IBurrowGameDispatcher { contract_address: game_address };
    
    // Setup: Set STRK token and transfer some to user
    start_cheat_caller_address(game_address, owner);
    game_dispatcher.set_strk_token(strk_address);
    stop_cheat_caller_address(game_address);
    
    start_cheat_caller_address(strk_address, owner);
    strk_dispatcher.transfer(user, 100_000000000000000000); // 100 mock STRK to user
    stop_cheat_caller_address(strk_address);
    
    // User approves game contract to spend STRK
    start_cheat_caller_address(strk_address, user);
    strk_dispatcher.approve(game_address, 50_000000000000000000); // Approve 50 STRK
    stop_cheat_caller_address(strk_address);
    
    // User stakes a Noob beaver (costs 12 STRK)
    start_cheat_caller_address(game_address, user);
    game_dispatcher.stake_beaver(0); // Noob beaver
    stop_cheat_caller_address(game_address);
    
    // Check beaver was created
    let user_beavers = game_dispatcher.get_user_beavers(user);
    assert(user_beavers.len() == 1, 'Should have 1 beaver');
    
    let beaver = game_dispatcher.get_beaver(user, *user_beavers.at(0));
    assert(beaver.beaver_type == 0, 'Wrong beaver type');
    assert(beaver.level == 1, 'Should start at level 1');
    assert(beaver.owner == user, 'Wrong beaver owner');
    
    // Check STRK was transferred
    let user_strk_balance = strk_dispatcher.balance_of(user);
    assert(user_strk_balance == 88_000000000000000000, 'Wrong user STRK balance'); // 100 - 12 = 88
} 