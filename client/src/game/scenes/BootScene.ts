import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }) }

  preload() {
    const { width, height } = this.scale
    const bar = this.add.graphics()

    this.load.on('progress', (v: number) => {
      bar.clear()
      bar.fillStyle(0x00c2ff, 1)
      bar.fillRect(width / 2 - 120, height / 2, 240 * v, 4)
    })

    this.generateTextures()
  }

  private generateTextures() {
    const player = this.make.graphics({ x: 0, y: 0 })
    player.fillStyle(0x5b8dd9)
    player.fillRoundedRect(0, 0, 32, 40, 6)
    player.fillStyle(0x00c2ff)
    player.fillRoundedRect(6, 8, 20, 12, 3)

    player.fillStyle(0xffffff, 0.4)
    player.fillRoundedRect(8, 10, 8, 4, 2)
    player.fillStyle(0x3a5fa8)
    player.fillRect(6, 34, 8, 8)
    player.fillRect(18, 34, 8, 8)
    player.generateTexture('player', 32, 44)
    player.destroy()

    const ground = this.make.graphics({ x: 0, y: 0 })
    ground.fillStyle(0x1a2a3a)
    ground.fillRect(0, 0, 64, 32)
    ground.fillStyle(0x00c2ff, 0.15)
    ground.fillRect(0, 0, 64, 2)
    ground.fillStyle(0x0d1a28)
    ground.fillRect(0, 2, 64, 30)
    ground.fillStyle(0x00c2ff, 0.08)
    ground.fillRect(8, 8, 48, 1)
    ground.fillRect(8, 16, 48, 1)
    ground.fillRect(8, 24, 48, 1)
    ground.generateTexture('ground', 64, 32)
    ground.destroy()

    const spike = this.make.graphics({ x: 0, y: 0 })
    spike.fillStyle(0xff3355)
    spike.fillRect(0, 0, 28, 56)
    spike.fillStyle(0xff6677, 0.6)
    spike.fillRect(2, 2, 10, 52)
    spike.fillStyle(0xff0033)
    spike.fillRect(0, 0, 28, 4)
    
    const spikeText = this.add.text(14, 28, '⚡', {
      fontSize: '18px', color: '#ffff00'
    }).setOrigin(0.5).setVisible(false)
    spike.generateTexture('obstacle_spike', 28, 56)
    spike.destroy()
    spikeText.destroy()

    const rug = this.make.graphics({ x: 0, y: 0 })
    rug.fillStyle(0xff8800)
    rug.fillRect(0, 0, 40, 20)
    rug.fillStyle(0xffaa00, 0.5)
    rug.fillRect(2, 2, 36, 8)
    rug.generateTexture('obstacle_rug', 40, 20)
    rug.destroy()

    const fork = this.make.graphics({ x: 0, y: 0 })
    fork.fillStyle(0xaa44ff)
    fork.fillRect(14, 0, 12, 48)
    fork.fillRect(0, 0, 12, 24)
    fork.fillRect(28, 0, 12, 24)
    fork.fillStyle(0xcc88ff, 0.4)
    fork.fillRect(15, 2, 5, 44)
    fork.generateTexture('obstacle_fork', 40, 48)
    fork.destroy()

    const token = this.make.graphics({ x: 0, y: 0 })
    token.fillStyle(0xffaa00)
    token.fillCircle(12, 12, 12)
    token.fillStyle(0xffcc44)
    token.fillCircle(12, 12, 9)
    token.fillStyle(0xffaa00)
    token.fillCircle(12, 12, 6)
    token.fillStyle(0xffe066, 0.8)
    token.fillCircle(9, 9, 3)
    token.generateTexture('token', 24, 24)
    token.destroy()

    const shield = this.make.graphics({ x: 0, y: 0 })
    shield.fillStyle(0x00c2ff, 0.8)
    shield.fillRoundedRect(0, 0, 24, 28, 4)
    shield.fillStyle(0x44ddff)
    shield.fillRoundedRect(4, 4, 16, 12, 2)
    shield.generateTexture('shield', 24, 28)
    shield.destroy()

    const particle = this.make.graphics({ x: 0, y: 0 })
    particle.fillStyle(0xffffff)
    particle.fillCircle(4, 4, 4)
    particle.generateTexture('particle', 8, 8)
    particle.destroy()
  }

  create() {
    this.scene.start('GameScene')
  }
}