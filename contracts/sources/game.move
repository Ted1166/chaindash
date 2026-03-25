module chaindash::game;

use std::string::{Self, String};
use sui::event;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::clock::{Self, Clock};

const EInsufficientEntryFee: u64 = 1;
const ESessionNotOwned: u64      = 2;
const ESessionAlreadyEnded: u64  = 3;

const ENTRY_FEE_MIST: u64 = 10_000_000;


public struct PlayerProfile has key, store {
    id: UID,
    owner: address,
    username: String,
    total_runs: u64,
    best_score: u64,
    total_tokens: u64,
    created_at: u64,
}

public struct GameSession has key, store {
    id: UID,
    player: address,
    score: u64,
    tokens_collected: u64,
    distance: u64,
    ai_difficulty: u64,
    active: bool,
    started_at: u64,
}


public struct ProfileCreated has copy, drop {
    profile_id: ID,
    owner: address,
    username: String,
}

public struct SessionStarted has copy, drop {
    session_id: ID,
    player: address,
    started_at: u64,
}

public struct ScoreSubmitted has copy, drop {
    session_id: ID,
    player: address,
    score: u64,
    tokens_collected: u64,
    distance: u64,
    ai_difficulty: u64,
}


public fun create_profile(
    username: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
): PlayerProfile {
    let profile = PlayerProfile {
        id: object::new(ctx),
        owner: ctx.sender(),
        username: string::utf8(username),
        total_runs: 0,
        best_score: 0,
        total_tokens: 0,
        created_at: clock::timestamp_ms(clock),
    };

    event::emit(ProfileCreated {
        profile_id: object::id(&profile),
        owner: ctx.sender(),
        username: profile.username,
    });

    profile
}

public fun start_session(
    payment: &mut Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
): GameSession {
    assert!(coin::value(payment) >= ENTRY_FEE_MIST, EInsufficientEntryFee);

    let fee = coin::split(payment, ENTRY_FEE_MIST, ctx);
    transfer::public_transfer(fee, @chaindash);

    let now = clock::timestamp_ms(clock);

    let session = GameSession {
        id: object::new(ctx),
        player: ctx.sender(),
        score: 0,
        tokens_collected: 0,
        distance: 0,
        ai_difficulty: 0,
        active: true,
        started_at: now,
    };

    event::emit(SessionStarted {
        session_id: object::id(&session),
        player: ctx.sender(),
        started_at: now,
    });

    session
}

public fun submit_score(
    profile: &mut PlayerProfile,
    session: GameSession,
    score: u64,
    tokens_collected: u64,
    distance: u64,
    ai_difficulty: u64,
    ctx: &mut TxContext,
) {
    assert!(session.player == ctx.sender(), ESessionNotOwned);
    assert!(session.active, ESessionAlreadyEnded);

    profile.total_runs = profile.total_runs + 1;
    profile.total_tokens = profile.total_tokens + tokens_collected;
    if (score > profile.best_score) {
        profile.best_score = score;
    };

    let session_id = object::id(&session);

    let GameSession {
        id,
        player: _,
        score: _,
        tokens_collected: _,
        distance: _,
        ai_difficulty: _,
        active: _,
        started_at: _,
    } = session;
    object::delete(id);

    event::emit(ScoreSubmitted {
        session_id,
        player: ctx.sender(),
        score,
        tokens_collected,
        distance,
        ai_difficulty,
    });
}


public fun profile_best_score(profile: &PlayerProfile): u64  { profile.best_score }
public fun profile_total_runs(profile: &PlayerProfile): u64  { profile.total_runs }
public fun profile_username(profile: &PlayerProfile): String { profile.username }
public fun entry_fee(): u64 { ENTRY_FEE_MIST }
