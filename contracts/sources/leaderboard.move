module chaindash::leaderboard;

use std::string::String;
use sui::event;

const MAX_ENTRIES: u64 = 10;


public struct LeaderboardEntry has copy, drop, store {
    player: address,
    username: String,
    score: u64,
    ai_difficulty: u64,
    session_id: ID,
}

public struct Leaderboard has key {
    id: UID,
    entries: vector<LeaderboardEntry>,
    total_games: u64,
}

public struct AdminCap has key, store {
    id: UID,
}


public struct LeaderboardUpdated has copy, drop {
    player: address,
    new_score: u64,
    rank: u64,
}


fun init(ctx: &mut TxContext) {
    let leaderboard = Leaderboard {
        id: object::new(ctx),
        entries: vector[],
        total_games: 0,
    };
    transfer::share_object(leaderboard);

    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(admin_cap, ctx.sender());
}


public fun try_insert(
    board: &mut Leaderboard,
    player: address,
    username: String,
    score: u64,
    ai_difficulty: u64,
    session_id: ID,
) {
    board.total_games = board.total_games + 1;

    let len = board.entries.length();
    let qualifies = len < MAX_ENTRIES || score > lowest_score(board);
    if (!qualifies) return;

    let mut i = 0;
    while (i < board.entries.length()) {
        if (board.entries[i].player == player) {
            if (board.entries[i].score >= score) return;
            board.entries.remove(i);
            break
        };
        i = i + 1;
    };

    board.entries.push_back(LeaderboardEntry {
        player,
        username,
        score,
        ai_difficulty,
        session_id,
    });

    sort_entries(&mut board.entries);

    while (board.entries.length() > MAX_ENTRIES) {
        board.entries.pop_back();
    };

    let mut rank = 1;
    let mut j = 0;
    while (j < board.entries.length()) {
        if (board.entries[j].player == player) {
            rank = j + 1;
            break
        };
        j = j + 1;
    };

    event::emit(LeaderboardUpdated { player, new_score: score, rank });
}


public fun get_entries(board: &Leaderboard): vector<LeaderboardEntry> { board.entries }
public fun total_games(board: &Leaderboard): u64                      { board.total_games }
public fun entry_score(e: &LeaderboardEntry): u64                     { e.score }
public fun entry_player(e: &LeaderboardEntry): address                { e.player }
public fun entry_username(e: &LeaderboardEntry): String               { e.username }
public fun entry_ai_difficulty(e: &LeaderboardEntry): u64             { e.ai_difficulty }


fun lowest_score(board: &Leaderboard): u64 {
    if (board.entries.is_empty()) return 0;
    board.entries[board.entries.length() - 1].score
}

fun sort_entries(entries: &mut vector<LeaderboardEntry>) {
    let n = entries.length();
    let mut i = 1;
    while (i < n) {
        let mut j = i;
        while (j > 0 && entries[j].score > entries[j - 1].score) {
            entries.swap(j, j - 1);
            j = j - 1;
        };
        i = i + 1;
    };
}
