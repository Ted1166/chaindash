import Phaser from 'phaser'
import { useGameStore } from '../../hooks/useGameStore'

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text
  private tokensText!: Phaser.GameObjects.Text
  private difficultyBar!: Phaser.GameObjects.Rectangle
//   private _difficultyBg!: Phaser.GameObjects.Rectangle
  private difficultyLabel!: Phaser.GameObjects.Text
  private aiLabel!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'UIScene' })
  }

  create() {
    // Score
    this.scoreText = this.add.text(16, 16, '0', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#EEEDFE',
      stroke: '#26215c',
      strokeThickness: 3,
    })

    // Token count
    this.tokensText = this.add.text(16, 52, '⬡ 0', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#FAC775',
    })

    // AI difficulty bar (bottom right)
    const barX = 320
    const barY = 608
    const barW = 144
    const barH = 10

    this.add.text(barX, barY - 18, 'AI DIFFICULTY', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#9FE1CB',
    })

    // this._difficultyBg = this.add.rectangle(barX, barY, barW, barH, 0x26215c)
    //   .setOrigin(0, 0.5)

    this.add.rectangle(barX, barY, barW, barH, 0x26215c).setOrigin(0, 0.5)
    this.difficultyBar = this.add.rectangle(barX, barY, 20, barH, 0x1d9e75)
      .setOrigin(0, 0.5)
    this.difficultyLabel = this.add.text(barX + barW + 6, barY - 6, '20', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#9FE1CB',
    })

    // "AI Adapting..." flash when difficulty changes
    this.aiLabel = this.add.text(240, 580, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#1d9e75',
    }).setOrigin(0.5)

    // Poll store 10 times per second
    this.time.addEvent({
      delay: 100,
      callback: this.updateHUD,
      callbackScope: this,
      loop: true,
    })
  }

  private lastDifficulty = -1

  updateHUD() {
    const state = useGameStore.getState()

    this.scoreText.setText(state.score.toLocaleString())
    this.tokensText.setText(`⬡ ${state.tokensCollected}`)

    const diff = state.aiDifficulty
    const barMaxW = 144
    this.difficultyBar.width = Math.max(4, (diff / 100) * barMaxW)
    this.difficultyLabel.setText(String(diff))

    // Colour the bar: green → amber → red
    if (diff < 40) this.difficultyBar.fillColor = 0x1d9e75
    else if (diff < 70) this.difficultyBar.fillColor = 0xef9f27
    else this.difficultyBar.fillColor = 0xe24b4a

    // Flash label when AI adjusts
    if (diff !== this.lastDifficulty) {
      this.lastDifficulty = diff
      this.aiLabel.setText('AI adapting...')
      this.tweens.add({
        targets: this.aiLabel,
        alpha: { from: 1, to: 0 },
        duration: 1500,
        ease: 'Linear',
      })
    }
  }
}
