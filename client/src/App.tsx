import { useCurrentAccount } from '@mysten/dapp-kit'
import { useState } from 'react'
import WalletConnect from './components/WalletConnect'
import GameCanvas from './game/GameCanvas'
import Leaderboard from './components/Leaderboard'
import GameOver from './components/GameOver'
import { useGameStore } from './hooks/useGameStore'
import './App.css'

type Screen = 'home' | 'game' | 'gameover' | 'leaderboard'

export default function App() {
  const account = useCurrentAccount()
  const [screen, setScreen] = useState<Screen>('home')
  const { lastSession } = useGameStore()

  function handleGameOver() {
    setScreen('gameover')
  }

  function handlePlayAgain() {
    setScreen('game')
  }

  if (!account) {
    return (
      <div className="screen screen--connect">
        <div className="logo">
          <span className="logo__chain">Chain</span>
          <span className="logo__dash">Dash</span>
          <span className="logo__ai"> AI</span>
        </div>
        <p className="tagline">Run. Collect. Adapt. Compete.</p>
        <WalletConnect />
      </div>
    )
  }

  return (
    <div className="screen">
      {screen === 'home' && (
        <div className="screen screen--home">
          <div className="logo">
            <span className="logo__chain">Chain</span>
            <span className="logo__dash">Dash</span>
            <span className="logo__ai"> AI</span>
          </div>
          <p className="tagline">An AI that learns your skill level. A chain that records your glory.</p>
          <div className="home-actions">
            <button className="btn btn--primary" onClick={() => setScreen('game')}>
              Play (0.01 SUI entry)
            </button>
            <button className="btn btn--secondary" onClick={() => setScreen('leaderboard')}>
              Leaderboard
            </button>
          </div>
          <WalletConnect compact />
        </div>
      )}

      {screen === 'game' && (
        <GameCanvas onGameOver={handleGameOver} />
      )}

      {screen === 'gameover' && lastSession && (
        <GameOver
          session={lastSession}
          onPlayAgain={handlePlayAgain}
          onLeaderboard={() => setScreen('leaderboard')}
          onHome={() => setScreen('home')}
        />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard onBack={() => setScreen('home')} />
      )}
    </div>
  )
}
