import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // Generate all graphics procedurally — no external asset files needed for MVP.
    // This keeps the demo completely self-contained.
    this.createPlayerTexture()
    this.createObstacleTextures()
    this.createTokenTexture()
    this.createGroundTexture()
    this.createBackgroundTexture()
  }

  create() {
    this.scene.start('GameScene')
  }

  // ── Procedural texture generators ────────────────────────────────────────────

  private createPlayerTexture() {
    const g = this.make.graphics({ x: 0, y: 0 })
    // Body
    g.fillStyle(0x7f77dd)
    g.fillRoundedRect(4, 8, 28, 28, 6)
    // Visor
    g.fillStyle(0xcecbf6)
    g.fillRoundedRect(8, 12, 16, 10, 3)
    // Legs
    g.fillStyle(0x534ab7)
    g.fillRect(8, 34, 8, 10)
    g.fillRect(20, 34, 8, 10)
    g.generateTexture('player', 36, 48)
    g.destroy()
  }

  private createObstacleTextures() {
    // Gas spike — red spike
    const spike = this.make.graphics({ x: 0, y: 0 })
    spike.fillStyle(0xe24b4a)
    spike.fillTriangle(20, 0, 40, 60, 0, 60)
    spike.fillStyle(0xf09595)
    spike.fillTriangle(20, 8, 34, 60, 6, 60)
    spike.generateTexture('obstacle_spike', 40, 60)
    spike.destroy()

    // Fork bomb — yellow split
    const fork = this.make.graphics({ x: 0, y: 0 })
    fork.fillStyle(0xef9f27)
    fork.fillRoundedRect(0, 20, 50, 20, 4)
    fork.fillStyle(0xfac775)
    fork.fillTriangle(0, 20, 25, 0, 50, 20)
    fork.generateTexture('obstacle_fork', 50, 40)
    fork.destroy()

    // Rug pull — floor tile that disappears
    const rug = this.make.graphics({ x: 0, y: 0 })
    rug.fillStyle(0x378add)
    rug.fillRoundedRect(0, 0, 80, 18, 4)
    rug.lineStyle(1, 0x85b7eb)
    rug.strokeRoundedRect(0, 0, 80, 18, 4)
    rug.generateTexture('obstacle_rug', 80, 18)
    rug.destroy()

    // Validator node — big bouncer
    const node = this.make.graphics({ x: 0, y: 0 })
    node.fillStyle(0x1d9e75)
    node.fillCircle(24, 24, 24)
    node.fillStyle(0x9fe1cb)
    node.fillCircle(24, 18, 10)
    node.generateTexture('obstacle_node', 48, 48)
    node.destroy()
  }

  private createTokenTexture() {
    const g = this.make.graphics({ x: 0, y: 0 })
    g.fillStyle(0xef9f27)
    g.fillCircle(12, 12, 12)
    g.fillStyle(0xfac775)
    g.fillCircle(12, 10, 7)
    g.generateTexture('token', 24, 24)
    g.destroy()
  }

  private createGroundTexture() {
    const g = this.make.graphics({ x: 0, y: 0 })
    g.fillStyle(0x26215c)
    g.fillRect(0, 0, 480, 20)
    g.lineStyle(1, 0x534ab7)
    g.lineBetween(0, 0, 480, 0)
    g.generateTexture('ground', 480, 20)
    g.destroy()
  }

  private createBackgroundTexture() {
    const g = this.make.graphics({ x: 0, y: 0 })
    // Deep space gradient simulation using layered rects
    g.fillStyle(0x0f0f1a)
    g.fillRect(0, 0, 480, 640)
    // Grid lines (blockchain theme)
    g.lineStyle(0.5, 0x26215c, 0.4)
    for (let x = 0; x < 480; x += 40) g.lineBetween(x, 0, x, 640)
    for (let y = 0; y < 640; y += 40) g.lineBetween(0, y, 480, y)
    // Stars
    g.fillStyle(0xffffff, 0.6)
    for (let i = 0; i < 60; i++) {
      g.fillRect(Math.random() * 480, Math.random() * 640, 1, 1)
    }
    g.generateTexture('bg', 480, 640)
    g.destroy()
  }
}
