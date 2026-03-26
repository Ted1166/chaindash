import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import BootScene  from './scenes/BootScene'
import GameScene  from './scenes/GameScene'
import UIScene    from './scenes/UIScene'
import type { RunResult } from '../App'

interface Props {
  wallet:    string | null
  onRunEnd:  (result: RunResult) => void
  onMenu:    () => void
}

export default function GameCanvas({ wallet, onRunEnd, onMenu }: Props) {
  const mountRef  = useRef<HTMLDivElement>(null)
  const gameRef   = useRef<Phaser.Game | null>(null)
  const sceneRef  = useRef<GameScene | null>(null)

  const [score,        setScore]        = useState(0)
  const [tokens,       setTokens]       = useState(0)
  const [aiDifficulty, setAiDifficulty] = useState(20)

  useEffect(() => {
    if (!mountRef.current || gameRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type:   Phaser.AUTO,
      width:  800,
      height: 560,
      parent: mountRef.current,
      backgroundColor: '#020408',
      physics: {
        default: 'arcade',
        arcade:  { gravity: { x: 0, y: 0 }, debug: false },
      },
      scene:  [BootScene, GameScene, UIScene],
      scale: {
        mode:            Phaser.Scale.FIT,
        autoCenter:      Phaser.Scale.CENTER_BOTH,
        width:           800,
        height:          560,
      },
    }

    const game = new Phaser.Game(config)
    gameRef.current = game

    game.events.once('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene
      sceneRef.current = scene

      if (wallet) scene.walletAddress = wallet

      scene.onScoreUpdate = setScore
      scene.onTokenUpdate = setTokens
      scene.onAIUpdate    = (d) => setAiDifficulty(d)
      scene.onGameOver    = (result) => {
        const bestPrev = parseInt(localStorage.getItem('chaindash_best') ?? '0')
        const isNewBest = result.score > bestPrev
        if (isNewBest) localStorage.setItem('chaindash_best', String(result.score))
        onRunEnd({ ...result, isNewBest })
      }
    })

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  const aiPct = `${aiDifficulty}%`

  return (
    <div className="game-wrap">
      {/* Phaser canvas mount point */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* React HUD overlay */}
      <div className="game-hud">
        <div>
          <div className="hud-score-label">SCORE</div>
          <div className="hud-score">{score.toLocaleString()}</div>
        </div>

        <div>
          <div className="hud-score-label" style={{ textAlign: 'center' }}>TOKENS</div>
          <div className="hud-tokens">◈ {tokens}</div>
        </div>

        <div className="hud-right">
          <div className="hud-ai-label">AI DIFFICULTY · {aiDifficulty}</div>
          <div className="hud-ai-bar-track">
            <div className="hud-ai-bar-fill" style={{ width: aiPct }} />
          </div>
        </div>
      </div>

      <button className="game-menu-btn" onClick={onMenu}>
        ← MENU
      </button>
    </div>
  )
}