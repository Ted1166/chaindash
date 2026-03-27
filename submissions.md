# ChainDash — OneHack 3.0 Submission Package

---

## Project Name
**ChainDash**

## Tagline
AI-Adaptive Arcade Runner on OneChain — fun first, chain second.

---

## Project Description

ChainDash is a browser-based endless arcade runner built on OneChain's Move infrastructure, where an AI engine called **DashIQ** silently learns how you play and adapts the game in real time. It is the first GameFi arcade title to combine on-chain score verification with a live adaptive difficulty engine — no two players ever face the same challenge curve.

### The Problem
Most GameFi projects are financial products wearing a game skin. Spin wheels, click-to-earn loops, and static difficulty settings do not constitute gameplay. Players churn within days because there is no reason to return.

### The Solution
ChainDash is a real game first. The DashIQ AI engine tracks reaction speed, avoidance rate, and score history across runs, and dynamically tunes obstacle density, speed, and gap timing every 5 seconds. A struggling player gets breathing room. A skilled player faces walls. Every run feels different — not because of randomness, but because the game knows you.

On top of that, every score is verified on-chain. Entry fees accumulate in a shared prize pool. Every week, the top 3 wallets split the pool — 60%, 25%, 15% — paid out directly by the smart contract with no middleman.

---

## Build Track
- **Primary:** GameFi
- **Secondary:** AI (DashIQ adaptive difficulty engine)

---

## OneChain Product Integrations

| Product | How it's used |
|---|---|
| **OneWallet** | Player identity and transaction signing |
| **Move contracts** | Score verification, leaderboard, prize pool |
| **OneTransfer** | Entry fee collection and weekly prize distribution |

---

## Links

| Resource | URL |
|---|---|
| **Demo Video** | https://youtu.be/YdxvevMd-Qw |
| **GitHub Repository** | https://github.com/Ted1166/chaindash |
| **Live Game** | https://chaindash.vercel.app |

---

## Deployed Contracts (Sui Testnet)

| Contract | Object ID |
|---|---|
| **Package** | `0x989e99dcb5ca02662d0a603374e88985ddd36b48f4d8bf9a8dd3e2a1d1d49b0f` |
| **Leaderboard** | `0x12f885c41f3dfedbda92b8f50b4d964f45915f163a5c933169a5810c5485a8d4` |
| **Prize Pool** | `0x23c8d639615adcee821dc13f7ef31e7037e65b460955d509705e2783e3eeed8e` |

Explorer: https://suiexplorer.com/object/0x989e99dcb5ca02662d0a603374e88985ddd36b48f4d8bf9a8dd3e2a1d1d49b0f?network=testnet

---

## Technical Architecture

### Stack
- **Frontend:** React + Vite + TypeScript + Phaser 3
- **AI Engine:** Python FastAPI + NumPy (DashIQ adaptive difficulty)
- **Smart Contracts:** Move (3 modules: game, leaderboard, prize_pool)
- **Wallet:** @mysten/dapp-kit (Sui Wallet compatible)
- **Deployment:** Vercel (frontend) + Railway (AI engine)

### How it works

```
Player connects wallet
       ↓
Starts run → entry fee sent via OneTransfer
       ↓
Phaser 3 game loop begins
       ↓
Every 5s → DashIQ AI poll → adjusts speed + obstacles
       ↓
Player dies → score finalised
       ↓
Score submitted to Leaderboard contract on-chain
       ↓
Weekly → admin triggers PrizePool distribution → top 3 paid
```

### DashIQ AI Engine
The DashIQ engine is a FastAPI microservice that maintains a per-player skill model using an exponential moving average (EMA) over adjusted scores. It normalises raw scores by difficulty level so runs are comparable, tracks recent trend via linear regression, and combines skill ratio + trend + live avoidance rate to compute the next difficulty target. The response — `difficulty`, `speed_multiplier`, `gap_multiplier` — is applied to the game every 5 seconds with a maximum delta of 8 points per poll to prevent jarring difficulty spikes.

### Smart Contract Modules

**`game.move`** — PlayerProfile (owned, tracks lifetime stats), GameSession (created per run, destroyed on submission), entry fee handling, score submission with event emission.

**`leaderboard.move`** — Shared global top-10 leaderboard, insertion sort on ≤11 entries, per-player deduplication (keeps personal best), LeaderboardUpdated events for frontend sync.

**`prize_pool.move`** — Shared prize pool accumulating entry fees via Balance<SUI>, admin-gated weekly distribution (60/25/15 basis points), seasonal tracking.

---

## What Makes This Different

1. **AI is not cosmetic** — DashIQ is a real skill model with EMA, trend detection, and live signals. It runs as a separate service, is independently testable, and produces measurably different difficulty curves per player.

2. **It's actually fun** — 6 obstacle types, double obstacles at high difficulty, floating validator nodes, shield pickups, token bonuses that scale with difficulty. The game loop is genuinely engaging independent of the blockchain layer.

3. **Clean economic design** — entry fees → prize pool → weekly payout is a self-sustaining loop. No inflationary token minting. No click-to-earn nonsense.

4. **Production-oriented** — working MVP, deployed contracts, live AI engine, full source code, 3-minute demo video. Not a prototype. Not a pitch.

---

## Team
**Adams** — Solo builder
- Move smart contracts
- Phaser 3 game engine
- React/TypeScript frontend
- Python AI microservice
- Deployment and infrastructure

---

## Submission Checklist

- [x] Project description
- [x] Integration with OneChain products (OneWallet, Move contracts, OneTransfer)
- [x] Working MVP — playable at https://chaindash.vercel.app
- [x] Demo video (3 minutes) — https://youtu.be/YdxvevMd-Qw
- [x] Source code — https://github.com/Ted1166/chaindash

---

*Built for OneHack 3.0 · February–March 2025*