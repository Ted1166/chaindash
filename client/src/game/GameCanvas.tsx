import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import BootScene  from './scenes/BootScene'
import GameScene  from './scenes/GameScene'
import UIScene    from './scenes/UIScene'
import type { RunResult } from '../App'
import { useSignAndExecuteTransaction } from '@onelabs/dapp-kit'
import { buildLeaderboardInsertTransaction, LEADERBOARD_ID } from '../chain/contracts'

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
  const [aiReason, setAiReason] = useState('Warming up...')
  const [aiSpeed,  setAiSpeed]  = useState(1.0)
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

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
      scene.onAIUpdate = (d, spd, _gap, reason) => {
        setAiDifficulty(d)
        setAiSpeed(spd)
        if (reason) setAiReason(reason)
      }
      scene.onGameOver = async (result) => {
        const bestPrev  = parseInt(localStorage.getItem('chaindash_best') ?? '0')
        const isNewBest = result.score > bestPrev
        if (isNewBest) localStorage.setItem('chaindash_best', String(result.score))

        if (wallet) {
          try {
            const tx = buildLeaderboardInsertTransaction({
              leaderboardId: LEADERBOARD_ID,
              player:        wallet,
              username:      wallet.slice(0, 8),
              score:         result.score,
              aiDifficulty:  result.aiDifficulty,
              sessionId:     '0x0000000000000000000000000000000000000000000000000000000000000000',
            })
            await signAndExecute({ transaction: tx })
            console.log('Score submitted on-chain ✓')
          } catch (err) {
            console.warn('Chain submission failed (non-critical):', err)
          }
        }

        onRunEnd({ ...result, isNewBest })
      }
    })

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

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
            <div
              className="hud-ai-bar-fill"
              style={{
                width: `${aiDifficulty}%`,
                background: aiDifficulty < 30 ? '#00ff88'
                          : aiDifficulty < 55 ? '#ffaa00'
                          : aiDifficulty < 75 ? '#ff6633'
                          : '#ff3355',
              }}
            />
          </div>
          <div className="hud-ai-tier" style={{
            color: aiDifficulty < 30 ? '#00ff88'
                : aiDifficulty < 55 ? '#ffaa00'
                : aiDifficulty < 75 ? '#ff6633'
                : '#ff3355',
          }}>
            {aiDifficulty < 30 ? 'EASY'
            : aiDifficulty < 55 ? 'MEDIUM'
            : aiDifficulty < 75 ? 'HARD'
            : 'EXTREME'}
            {' '}· SPEED {aiSpeed.toFixed(2)}x
          </div>
          <div className="hud-ai-reason">{aiReason}</div>
        </div>
      </div>

      <button className="game-menu-btn" onClick={onMenu}>
        ← MENU
      </button>
    </div>
  )
}