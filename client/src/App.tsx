import { useState, useEffect } from 'react'
import './App.css'
import WalletConnect from './components/WalletConnect'
import GameCanvas    from './game/GameCanvas'
import GameOver      from './components/GameOver'
import Leaderboard   from './components/Leaderboard'

export type Screen = 'menu' | 'game' | 'gameover' | 'leaderboard'

export interface RunResult {
  score:           number
  tokensCollected: number
  distance:        number
  aiDifficulty:    number
  isNewBest:       boolean
}

function generateGuestId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return '0xguest_' + hex.slice(0, 16)
}

export default function App() {
  const [screen,    setScreen]    = useState<Screen>('menu')
  const [wallet,    setWallet]    = useState<string | null>(null)
  const [guestId,   setGuestId]   = useState<string | null>(null)
  const [lastRun,   setLastRun]   = useState<RunResult | null>(null)
  const [bestScore, setBestScore] = useState<number>(0)

  useEffect(() => {
    const stored = sessionStorage.getItem('chaindash_guest_id')
    if (stored) {
      setGuestId(stored)
    } else {
      const id = generateGuestId()
      sessionStorage.setItem('chaindash_guest_id', id)
      setGuestId(id)
    }
  }, [])

  // Active identity: real wallet takes priority over guest ID
  const activeAddress = wallet ?? guestId
  const isGuest       = !wallet

  function handleRunEnd(result: RunResult) {
    setLastRun(result)
    if (result.score > bestScore) setBestScore(result.score)
    setScreen('gameover')
  }

  function handlePlayAgain() {
    setLastRun(null)
    setScreen('game')
  }

  return (
    <div className="app-root">
      {screen === 'menu' && (
        <MenuScreen
          wallet={wallet}
          isGuest={isGuest}
          bestScore={bestScore}
          onConnect={setWallet}
          onPlay={() => setScreen('game')}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      )}

      {screen === 'game' && (
        <GameCanvas
          wallet={activeAddress}
          onRunEnd={handleRunEnd}
          onMenu={() => setScreen('menu')}
        />
      )}

      {screen === 'gameover' && lastRun && (
        <GameOver
          result={lastRun}
          wallet={wallet}
          isGuest={isGuest}
          onPlayAgain={handlePlayAgain}
          onMenu={() => setScreen('menu')}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard wallet={wallet} onBack={() => setScreen('menu')} />
      )}
    </div>
  )
}

interface MenuProps {
  wallet:        string | null
  isGuest:       boolean
  bestScore:     number
  onConnect:     (addr: string) => void
  onPlay:        () => void
  onLeaderboard: () => void
}

function MenuScreen({ wallet, isGuest, bestScore, onConnect, onPlay, onLeaderboard }: MenuProps) {
  return (
    <div className="menu-root">
      <div className="menu-bg-grid" />

      <div className="menu-content">
        <div className="menu-logo">
          <span className="logo-chain">CHAIN</span>
          <span className="logo-dash">DASH</span>
          <div className="logo-sub">AI-ADAPTIVE ARCADE · ONECHAIN</div>
        </div>

        {bestScore > 0 && (
          <div className="menu-stats">
            <div className="stat-chip">
              <span className="stat-label">BEST</span>
              <span className="stat-value">{bestScore.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="menu-wallet">
          <WalletConnect wallet={wallet} onConnect={onConnect} />
        </div>

        {/* Guest mode notice */}
        {isGuest && (
          <div className="guest-notice">
            Playing as guest — scores won't appear on-chain leaderboard.
            Connect wallet for full access.
          </div>
        )}

        <div className="menu-actions">
          <button className="btn-primary" onClick={onPlay}>
            <span className="btn-icon">▶</span>
            {isGuest ? 'PLAY AS GUEST' : 'PLAY'}
          </button>
          <button className="btn-secondary" onClick={onLeaderboard}>
            LEADERBOARD
          </button>
        </div>

        <div className="how-to-play">
          <div className="htp-title">HOW TO PLAY</div>
          <div className="htp-row">
            <span className="htp-key">SPACE / TAP</span>
            <span className="htp-desc">Jump</span>
          </div>
          <div className="htp-row">
            <span className="htp-key">DOUBLE TAP</span>
            <span className="htp-desc">Double jump</span>
          </div>
          <div className="htp-row">
            <span className="htp-key">AI ENGINE</span>
            <span className="htp-desc">Adapts difficulty to your skill</span>
          </div>
        </div>

        <div className="menu-footer">
          Entry fee · On-chain scores · Weekly prize pool
        </div>
      </div>
    </div>
  )
}