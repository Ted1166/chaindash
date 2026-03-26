<div align="center">

```
   ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗██████╗  █████╗ ███████╗██╗  ██╗     █████╗ ██╗
  ██╔════╝██║  ██║██╔══██╗██║████╗  ██║██╔══██╗██╔══██╗██╔════╝██║  ██║    ██╔══██╗██║
  ██║     ███████║███████║██║██╔██╗ ██║██║  ██║███████║███████╗███████║    ███████║██║
  ██║     ██╔══██║██╔══██║██║██║╚██╗██║██║  ██║██╔══██║╚════██║██╔══██║    ██╔══██║██║
  ╚██████╗██║  ██║██║  ██║██║██║ ╚████║██████╔╝██║  ██║███████║██║  ██║    ██║  ██║██║
   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝
```

**An AI-adaptive blockchain endless runner — built for OneHack 3.0**

[![Built on OneChain](https://img.shields.io/badge/Built%20on-OneChain-7f77dd?style=flat-square)](https://onelabs.cc)
[![Track](https://img.shields.io/badge/Track-GameFi%20%2B%20AI-1d9e75?style=flat-square)](#)
[![Move](https://img.shields.io/badge/Contracts-Move-ef9f27?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-MIT-e24b4a?style=flat-square)](LICENSE)

[Play Now](#) · [View on Explorer](https://suiscan.xyz/testnet/object/0x989e99dcb5ca02662d0a603374e88985ddd36b48f4d8bf9a8dd3e2a1d1d49b0f) · [Watch Demo](#)

</div>

---

## What is ChainDash AI?

ChainDash AI is a **casual endless runner** where nothing stays the same twice. An AI engine watches how you play — your reaction speed, how many obstacles you dodge, how far you get — and silently adjusts the game every 5 seconds to keep you right at the edge of your skill level.

Every run costs a small entry fee. Every score is recorded on-chain. The top players at the end of each week split the prize pool.

> *Run. Collect. Adapt. Compete.*

---

## How It Works

```
  You play          →    AI watches         →    Chain records
  ──────────             ───────────              ─────────────
  Tap to jump            Reaction speed           Score stored
  Dodge obstacles        Avoidance rate           Leaderboard updated
  Collect tokens         Recent score trend       Prize pool grows
                              ↓
                    Adjusts every 5 seconds:
                    - Obstacle speed
                    - Spawn frequency  
                    - Gap sizes
```

The AI doesn't pick Easy / Medium / Hard. It computes a **skill number from 0–100** specific to you, based on an exponential moving average of your adjusted scores across runs. A new player starts at 20. A veteran might sit at 75. The game always feels just hard enough to be exciting.

---

## Gameplay

### Controls

| Input | Action |
|---|---|
| `Spacebar` or `Tap` | Jump |
| `Spacebar` / `Tap` (again mid-air) | Double jump |

That's it. One mechanic, infinite depth.

### Obstacles

| Obstacle | Behaviour | How to beat |
|---|---|---|
| 🔴 **Gas Spike** | Tall wall rising from the ground | Jump over it |
| 🟡 **Fork Bomb** | Wide split block | Jump or duck timing |
| 🔵 **Rug Pull** | Floor tile that vanishes after 1 second | Jump before it disappears |
| 🟢 **Validator Node** | Large circular blocker | Precise timing jump |

### Collectibles

| Item | Effect |
|---|---|
| ⬡ **ONE Token** | Adds to your score multiplier + token count |
| ⚡ **Speed Boost** | 5-second acceleration burst |
| 🛡️ **Shield NFT** | Absorbs one hit |

### Scoring

- Base score ticks up every 100ms
- Score rate scales with AI difficulty — a run at difficulty 80 scores faster than one at difficulty 20
- Tokens collected are recorded on-chain alongside your score
- Your all-time personal best is stored in your `PlayerProfile` on OneChain

---

## AI Difficulty System

The AI engine runs as a separate Python service and is polled every 5 seconds during live gameplay.

### How the Skill Model Works

Each player has a rolling **EMA-adjusted score** — your raw score normalised by the difficulty you were playing at:

```
adjusted_score = raw_score / (ai_difficulty / 50)
```

This makes scores comparable across difficulty levels. A 500-point run at difficulty 80 is harder than a 500-point run at difficulty 20, so the model weights them differently.

### What Goes Into the Difficulty Target

```python
target = 50
       + (skill_ratio - 1.0) × 40    # are you above/below the global baseline?
       + trend × 15                  # are you improving or declining over recent runs?
       + (avoidance_rate - 0.5) × 40 # how well are you dodging right now?
       + reaction_signal             # how fast are you reacting this run?
```

Changes are **clamped to ±8 points per poll** — the game never lurches suddenly. It eases you up when you're dominating and backs off when you're struggling.

### Difficulty Outputs

| Parameter | Range | Effect |
|---|---|---|
| `difficulty` | 0 – 100 | Internal skill estimate |
| `speed_multiplier` | 0.8 – 1.6× | How fast obstacles scroll |
| `gap_multiplier` | 0.85 – 1.4× | How wide obstacle gaps are |

---

## On-Chain Architecture

All game state that matters is trustlessly stored on **OneChain** (Sui-compatible Move VM).

### Smart Contracts

#### `game.move`
The core game contract. Handles player identity, run sessions, and score submission.

```
create_profile(username)          → PlayerProfile (owned by wallet)
start_session(payment)            → GameSession (costs 0.01 SUI entry fee)
submit_score(profile, session, …) → destroys session, updates profile, emits event
```

- One `PlayerProfile` per wallet — stores lifetime stats (best score, total runs, tokens collected)
- `GameSession` is created at run start and destroyed at game over — no dangling state
- Scores are submitted **only on game over**, not during play — keeps gas costs minimal

#### `leaderboard.move`
A **shared object** — readable by anyone without a transaction. Stores top 10 all-time scores globally.

```
try_insert(player, username, score, ai_difficulty, session_id)
```

- Deduplicates per wallet — only your best score appears
- Sorted descending via insertion sort (max 10 entries — runs in microseconds)
- Each entry records the AI difficulty at time of the score — a rank earned at difficulty 90 means something

#### `prize_pool.move`
Entry fees accumulate here. Admin-gated weekly distribution to top 3 wallets.

```
deposit(payment)                              → adds entry fee to pool balance
distribute(admin, first, second, third)       → 60% / 25% / 15% split
```

| Place | Share |
|---|---|
| 🥇 1st | 60% |
| 🥈 2nd | 25% |
| 🥉 3rd | 15% |

### Deployed Contract IDs (Testnet)

| Object | ID |
|---|---|
| Package | `0x989e99dcb5ca02662d0a603374e88985ddd36b48f4d8bf9a8dd3e2a1d1d49b0f` |
| Leaderboard | `0x12f885c41f3dfedbda92b8f50b4d964f45915f163a5c933169a5810c5485a8d4` |
| Prize Pool | `0x23c8d639615adcee821dc13f7ef31e7037e65b460955d509705e2783e3eeed8e` |

---

## OneChain Product Integrations

| Product | How ChainDash uses it |
|---|---|
| **OneWallet** | Player authentication — connect wallet to play, no email or signup |
| **Move Contracts** | Score storage, leaderboard, prize pool logic — all on-chain |
| **OneTransfer** | Entry fee collection (0.01 SUI per run flows into prize pool) |
| **OneID** | Player usernames stored on-chain via `PlayerProfile` |
| **OneDEX** | *(Phase 2)* In-app swap so winners can convert prize SUI to any token |

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Game engine | **Phaser 3** | Best browser game framework — physics, input, scene management |
| Frontend | **React + Vite** | Fast dev cycle, easy wallet integration |
| Wallet | **@mysten/dapp-kit** | Native OneChain wallet connection |
| State | **Zustand** | Bridges Phaser game loop and React UI without re-renders |
| Smart contracts | **Move (OneChain)** | Required — also the right tool for owned objects + shared state |
| AI engine | **FastAPI + Python** | Async, <10ms response time, easy to deploy |
| ML model | **NumPy + EMA** | Lightweight — no GPU, no model download, runs anywhere |
| Hosting | **Vercel + Railway** | Free tier, zero config, instant deploys |

---

## Project Structure

```
chaindash/
├── contracts/                  Move smart contracts
│   └── sources/
│       ├── game.move           Player profiles, sessions, score submission
│       ├── leaderboard.move    Shared global top-10 leaderboard
│       └── prize_pool.move     Entry fee accumulation + weekly payouts
│
├── client/                     React + Vite frontend
│   └── src/
│       ├── game/
│       │   └── scenes/
│       │       ├── BootScene.ts     Procedural texture generation (no assets needed)
│       │       ├── GameScene.ts     Main game loop, physics, AI polling
│       │       └── UIScene.ts       HUD overlay (score, tokens, AI difficulty bar)
│       ├── chain/
│       │   └── contracts.ts         Typed transaction builders + chain read helpers
│       ├── ai/
│       │   └── client.ts            AI engine HTTP client with 2s timeout + fallback
│       ├── hooks/
│       │   └── useGameStore.ts      Zustand store bridging Phaser ↔ React
│       └── components/
│           ├── WalletConnect.tsx
│           ├── GameOver.tsx         Auto-submits score on mount
│           └── Leaderboard.tsx      Reads live from shared on-chain object
│
├── ai-engine/                  Python FastAPI difficulty service
│   ├── main.py
│   ├── routers/
│   │   └── difficulty.py       POST /difficulty  POST /run-result
│   └── models/
│       └── player_model.py     EMA-based per-player skill model
│
└── scripts/
    ├── deploy.sh               Publish contracts + auto-write .env
    └── test_ai.py              AI model unit tests
```

---

## Running Locally

### Prerequisites

- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) installed
- Node.js 20+
- Python 3.11+

### 1. Install Sui and get testnet funds

```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git \
  --branch testnet sui --features tracing

# Configure for testnet
sui client   # follow the prompts, set URL to https://fullnode.testnet.sui.io:443

# Get test SUI
sui client faucet
sui client balance  # should show ~1 SUI
```

### 2. Deploy contracts

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
# Publishes all three contracts and writes client/.env automatically
```

### 3. Run the frontend

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

### 4. Run the AI engine

```bash
cd ai-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI for testing)
```

---

## How a Full Run Works End-to-End

```
1. Player connects OneWallet
         ↓
2. Click "Play" → buildStartSession() transaction
   - Splits 0.01 SUI from gas coin
   - Calls game::start_session on-chain
   - Creates GameSession object owned by player
         ↓
3. Phaser game loop starts
   - Every 5s: POST /difficulty with player stats
   - AI returns speed_multiplier + gap_multiplier
   - Obstacle spawn rate and size update silently
         ↓
4. Player dies
   - Phaser calls store.endRun()
   - React transitions to GameOver screen
         ↓
5. GameOver auto-submits to chain:
   - buildSubmitScore() → destroys GameSession, updates PlayerProfile
   - buildInsertLeaderboard() → tries to enter top-10
         ↓
6. POST /run-result to AI engine
   - Model updates EMA with this run's adjusted score
   - Next run starts with refined difficulty
```

---

## Demo Video Script

> For the 3-minute OneHack submission video

| Time | Action |
|---|---|
| 0:00 | Open the app, connect OneWallet — show address in top corner |
| 0:20 | Click Play, sign the entry fee transaction — show tx toast |
| 0:40 | Play a run — narrate out loud when the AI difficulty bar changes colour |
| 1:20 | Die intentionally — show GameOver screen with score stats |
| 1:35 | Watch the "Submitting score to OneChain…" → "✓ Score recorded" flow |
| 1:50 | Open Leaderboard — show your score live from the shared object |
| 2:10 | Open Sui explorer — find the `ScoreSubmitted` event in the transaction |
| 2:30 | Open `localhost:8000/docs` — fire a manual `POST /difficulty` call |
| 2:50 | Closing pitch: *"AI that adapts to every player. Scores verified on OneChain. Prize pool funded by real entry fees. Built in 3 weeks."* |

---

## Submission Checklist

- [x] **Project description** — this README
- [x] **OneChain integration** — OneWallet auth, Move contracts, native coin entry fee, on-chain leaderboard
- [x] **Working MVP** — playable game, on-chain score submission, live leaderboard
- [x] **AI integration** — adaptive difficulty engine with per-player skill model
- [x] **Demo video** — script above
- [x] **Source code** — this repository

---

## What's Next (Post-Hackathon)

- **OnePredict integration** — spectators bet on whether a live player beats their personal best before the round ends
- **OneDEX in-app swap** — convert prize SUI to any token without leaving the game
- **Shield NFTs** — actual on-chain NFT objects that can be traded on secondary markets
- **Season system** — rolling 7-day seasons with automatic prize distribution via a cron job
- **Mobile app** — wrap in Capacitor, native touch controls

---

## Team

Built solo for **OneHack 3.0** — the global builder-first hackathon by OneChain.

---

<div align="center">

Made with ☕ and too many `sui client publish` attempts

**[Play ChainDash AI →](#)**

</div>