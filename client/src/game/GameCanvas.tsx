import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { GameScene } from '../game/scenes/GameScene'
import { UIScene } from '../game/scenes/UIScene'
import { BootScene } from '../game/scenes/BootScene'

interface Props {
  onGameOver: () => void
}

export default function GameCanvas({ onGameOver }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 480,
      height: 640,
      backgroundColor: '#0f0f1a',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 1200 }, debug: false },
      },
      scene: [BootScene, GameScene, UIScene],
      // Pass the React callback into Phaser via the game's global data
      callbacks: {
        postBoot: (game) => {
          game.registry.set('onGameOver', onGameOver)
        },
      },
    }

    gameRef.current = new Phaser.Game(config)

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [onGameOver])

  return (
    <div
      ref={containerRef}
      style={{
        width: 480,
        height: 640,
        margin: '0 auto',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    />
  )
}
