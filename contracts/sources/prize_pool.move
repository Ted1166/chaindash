module chaindash::prize_pool;

use sui::event;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::balance::{Self, Balance};

const EInsufficientFunds: u64 = 1;

const FIRST_PLACE_BPS:  u64 = 6_000;
const SECOND_PLACE_BPS: u64 = 2_500;
const THIRD_PLACE_BPS:  u64 = 1_500;


public struct PrizePool has key {
    id: UID,
    balance: Balance<SUI>,
    total_deposited: u64,
    total_distributed: u64,
    season: u64,
}

public struct PrizePoolAdmin has key, store {
    id: UID,
}


public struct FeeDeposited has copy, drop {
    amount: u64,
    pool_total: u64,
}

public struct PrizeDistributed has copy, drop {
    season: u64,
    first_place: address,
    first_amount: u64,
    second_place: address,
    second_amount: u64,
    third_place: address,
    third_amount: u64,
}


fun init(ctx: &mut TxContext) {
    let pool = PrizePool {
        id: object::new(ctx),
        balance: balance::zero(),
        total_deposited: 0,
        total_distributed: 0,
        season: 1,
    };
    transfer::share_object(pool);

    let admin = PrizePoolAdmin { id: object::new(ctx) };
    transfer::transfer(admin, ctx.sender());
}


public fun deposit(pool: &mut PrizePool, payment: Coin<SUI>) {
    let amount = coin::value(&payment);
    pool.total_deposited = pool.total_deposited + amount;
    balance::join(&mut pool.balance, coin::into_balance(payment));

    event::emit(FeeDeposited {
        amount,
        pool_total: balance::value(&pool.balance),
    });
}

public fun distribute(
    _admin: &PrizePoolAdmin,
    pool: &mut PrizePool,
    first_place: address,
    second_place: address,
    third_place: address,
    ctx: &mut TxContext,
) {
    let total = balance::value(&pool.balance);
    assert!(total > 0, EInsufficientFunds);

    let first_amount  = (total * FIRST_PLACE_BPS)  / 10_000;
    let second_amount = (total * SECOND_PLACE_BPS) / 10_000;
    let third_amount  = (total * THIRD_PLACE_BPS)  / 10_000;

    pool.total_distributed = pool.total_distributed + first_amount + second_amount + third_amount;

    let first_coin  = coin::from_balance(balance::split(&mut pool.balance, first_amount), ctx);
    let second_coin = coin::from_balance(balance::split(&mut pool.balance, second_amount), ctx);
    let third_coin  = coin::from_balance(balance::split(&mut pool.balance, third_amount), ctx);

    transfer::public_transfer(first_coin, first_place);
    transfer::public_transfer(second_coin, second_place);
    transfer::public_transfer(third_coin, third_place);

    event::emit(PrizeDistributed {
        season: pool.season,
        first_place,
        first_amount,
        second_place,
        second_amount,
        third_place,
        third_amount,
    });

    pool.season = pool.season + 1;
}


public fun pool_balance(pool: &PrizePool): u64  { balance::value(&pool.balance) }
public fun current_season(pool: &PrizePool): u64 { pool.season }
