import Phaser from 'phaser'
import { fetchDifficulty, recordRunResult } from '../../ai/client'

const GROUND_Y   = 520
const GRAVITY    = 900
const JUMP_VEL   = -540
const BASE_SPEED = 260

const OVERHEAD_CENTER_Y = GROUND_Y - 50

const DIFFICULTY_TIERS = [
  { minDiff: 0,  label: 'EASY',    color: '#00ff88' },
  { minDiff: 30, label: 'MEDIUM',  color: '#ffaa00' },
  { minDiff: 55, label: 'HARD',    color: '#ff6633' },
  { minDiff: 75, label: 'EXTREME', color: '#ff3355' },
]

interface ObstacleConfig {
  key:        string
  width:      number
  height:     number
  points:     number
  minDiff:    number
  y?:         number
  isOverhead?: boolean
}

const OBSTACLE_TYPES: ObstacleConfig[] = [
  { key: 'obstacle_spike',    width: 28, height: 56, points: 10, minDiff: 0  },
  { key: 'obstacle_spike',    width: 28, height: 56, points: 10, minDiff: 0  },
  { key: 'obstacle_fork',     width: 40, height: 48, points: 15, minDiff: 15 },
  { key: 'obstacle_rug',      width: 40, height: 20, points: 20, minDiff: 25 },
  { key: 'obstacle_node',     width: 40, height: 40, points: 25, minDiff: 40, y: GROUND_Y - 140 },
  { key: 'obstacle_spike',    width: 28, height: 80, points: 30, minDiff: 55 },
  { key: 'obstacle_wall',     width: 20, height: 90, points: 35, minDiff: 65 },
  { key: 'obstacle_fork',     width: 40, height: 64, points: 40, minDiff: 75 },

  { key: 'obstacle_overhead', width: 80, height: 36, points: 20, minDiff: 20,
    y: OVERHEAD_CENTER_Y, isOverhead: true },
  { key: 'obstacle_overhead', width: 80, height: 36, points: 20, minDiff: 20,
    y: OVERHEAD_CENTER_Y, isOverhead: true },
  { key: 'obstacle_overhead', width: 80, height: 36, points: 35, minDiff: 50,
    y: OVERHEAD_CENTER_Y, isOverhead: true },
]

export default class GameScene extends Phaser.Scene {
  private player!:    Phaser.Physics.Arcade.Sprite

  private isSliding:    boolean = false
  private slideTimer:   Phaser.Time.TimerEvent | null = null
  private pointerStartY: number = 0

  private grounds!:    Phaser.Physics.Arcade.StaticGroup
  private obstacles!:  Phaser.Physics.Arcade.Group
  private tokens!:     Phaser.Physics.Arcade.Group

  private score:           number = 0
  private tokensCollected: number = 0
  private distance:        number = 0
  private aiDifficulty:    number = 15
  private speedMultiplier: number = 1.0
  private gapMultiplier:   number = 1.3
  private gameSpeed:       number = BASE_SPEED
  private alive:           boolean = true
  private hasShield:       boolean = false
  private elapsedSeconds:  number  = 0
  private recentScores:    number[] = []

  private doubleObstacleChance: number = 0
  private currentTierIndex:     number = 0

  private cursors!:  Phaser.Types.Input.Keyboard.CursorKeys
  private spaceKey!: Phaser.Input.Keyboard.Key
  private downKey!:  Phaser.Input.Keyboard.Key

  public onScoreUpdate?:  (s: number) => void
  public onTokenUpdate?:  (t: number) => void
  public onAIUpdate?: (d: number, spd: number, gap: number, reason?: string) => void
  public onGameOver?:     (r: { score: number; tokensCollected: number; distance: number; aiDifficulty: number }) => void
  public walletAddress?:  string
  public lastAIReason: string = 'warming up...'

  constructor() { super({ key: 'GameScene' }) }

  create() {
    const { width, height } = this.scale

    this.add.rectangle(0, 0, width, height, 0x020408).setOrigin(0)
    const grid = this.add.graphics()
    grid.lineStyle(1, 0x1a2a3a, 0.4)
    for (let x = 0; x < width; x += 40)  grid.lineBetween(x, 0, x, height)
    for (let y = 0; y < height; y += 40) grid.lineBetween(0, y, width, y)
    this.add.rectangle(0, GROUND_Y - 1, width, 3, 0x00c2ff, 0.4).setOrigin(0)

    this.grounds = this.physics.add.staticGroup()
    for (let x = 0; x < width + 64; x += 64) {
      const tile = this.grounds.create(x, GROUND_Y + 16, 'ground') as Phaser.Physics.Arcade.Image
      tile.setImmovable(true).refreshBody()
    }

    this.player = this.physics.add.sprite(110, GROUND_Y - 22, 'player')
    this.player.setCollideWorldBounds(true).setBounce(0).setGravityY(GRAVITY)
    this.physics.add.collider(this.player, this.grounds)

    this.obstacles = this.physics.add.group()
    this.tokens    = this.physics.add.group()

    this.cursors  = this.input.keyboard!.createCursorKeys()
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.downKey  = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointerStartY = p.y
    })
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const dy = p.y - this.pointerStartY
      if (dy > 30) {
        this.doSlide()
      } else {
        this.doJump()
      }
    })

    this.physics.add.overlap(this.player, this.obstacles, this.handleHit,  undefined, this)
    this.physics.add.overlap(this.player, this.tokens,    this.handleToken, undefined, this)

    this.scheduleObstacle()
    this.scheduleToken()

    this.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        if (!this.alive) return
        this.elapsedSeconds += 0.1
        this.distance = Math.floor(this.elapsedSeconds * this.gameSpeed / 100)
        this.score += Math.floor(1 + this.aiDifficulty * 0.08)
        this.onScoreUpdate?.(this.score)
      },
    })

    this.time.addEvent({
      delay: 5000, loop: true,
      callback: this.pollAI, callbackScope: this,
    })

    this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        this.doubleObstacleChance = Math.max(0, (this.aiDifficulty - 60) / 100)
      },
    })

    this.showReadyText()
  }

  private doJump() {
    if (!this.alive || this.isSliding) return
    const onGround = this.player.body!.blocked.down

    if (onGround) {
      this.player.setVelocityY(JUMP_VEL)
      this.spawnJumpParticles()
    }
  }

  private doSlide() {
    if (!this.alive || this.isSliding) return
    if (!this.player.body!.blocked.down) return

    this.isSliding = true
    this.player.setScale(1, 0.45)

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setSize(30, 18, false)
    body.setOffset(1, 26)

    this.player.setAngle(-8)

    this.slideTimer?.destroy()
    this.slideTimer = this.time.delayedCall(700, () => this.standUp())
  }

  private standUp() {
    if (!this.isSliding) return
    this.isSliding = false
    this.player.setScale(1, 1)
    this.player.setAngle(0)
    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setSize(32, 44, false)
    body.setOffset(0, 0)
  }

  private scheduleObstacle() {
    const baseDelay  = 1400
    const minDelay   = 400
    const diffFactor = 1 - (this.aiDifficulty / 130)
    const delay      = Math.max(minDelay, baseDelay * this.gapMultiplier * diffFactor)

    this.time.addEvent({
      delay,
      callback: () => {
        if (!this.alive) return
        this.spawnObstacle()
        if (Math.random() < this.doubleObstacleChance) {
          this.time.delayedCall(350, this.spawnObstacle, [], this)
        }
        this.scheduleObstacle()
      },
    })
  }

  private spawnObstacle() {
    const { width } = this.scale
    const available = OBSTACLE_TYPES.filter(o => o.minDiff <= this.aiDifficulty)
    const type      = Phaser.Utils.Array.GetRandom(available) as ObstacleConfig

    const yPos = type.y ?? (GROUND_Y - type.height / 2)
    const obs  = this.obstacles.create(width + 50, yPos, type.key) as Phaser.Physics.Arcade.Image
    obs.setImmovable(true)
    obs.setVelocityX(-this.gameSpeed)
    obs.setData('points', type.points)
    obs.setData('isOverhead', type.isOverhead ?? false)

    if (type.key === 'obstacle_spike' && type.height === 80) obs.setScale(1, 1.4)
  }

  private scheduleToken() {
    const delay = Phaser.Math.Between(800, 2000)
    this.time.addEvent({
      delay,
      callback: () => {
        if (!this.alive) return
        this.spawnToken()
        this.scheduleToken()
      },
    })
  }

  private spawnToken() {
    const { width } = this.scale
    const yOptions = this.aiDifficulty > 50
      ? [GROUND_Y - 30, GROUND_Y - 90, GROUND_Y - 160, GROUND_Y - 220]
      : [GROUND_Y - 30, GROUND_Y - 80, GROUND_Y - 140]

    const y = Phaser.Utils.Array.GetRandom(yOptions) as number
    const t = this.tokens.create(width + 20, y, 'token') as Phaser.Physics.Arcade.Image
    t.setVelocityX(-this.gameSpeed * 0.9)

    const shieldChance = Math.max(0.03, 0.12 - this.aiDifficulty * 0.001)
    if (Math.random() < shieldChance) {
      const s = this.tokens.create(width + 20, GROUND_Y - 110, 'shield') as Phaser.Physics.Arcade.Image
      s.setVelocityX(-this.gameSpeed * 0.9)
      s.setData('isShield', true)
    }
  }

  private handleHit(_player: any, obstacle: any) {
    if (this.hasShield) {
      obstacle.destroy()
      this.hasShield = false
      this.cameras.main.flash(200, 0, 194, 255, false)
      this.showText('SHIELD!', '#00c2ff', 700)
      return
    }
    this.die()
  }

  private handleToken(_player: any, token: any) {
    const isShield = token.getData('isShield')
    const x = token.x
    const y = token.y
    token.destroy()

    if (isShield) {
      this.hasShield = true
      this.showText('SHIELD ACTIVE', '#00c2ff', 800)
    } else {
      this.tokensCollected++
      this.score += 50 + Math.floor(this.aiDifficulty * 0.5)
      this.onTokenUpdate?.(this.tokensCollected)
      this.spawnTokenParticles(x, y)
    }
  }

  private async pollAI() {
    const avoidanceRate = Math.min(0.95, 0.3 + this.elapsedSeconds / 120)
    const result = await fetchDifficulty({
      player:              this.walletAddress ?? 'demo_player',
      recent_scores:       this.recentScores.slice(0, 3),
      reaction_percentile: 50,
      avoidance_rate:      avoidanceRate,
      current_difficulty:  this.aiDifficulty,
      elapsed_seconds:     Math.floor(this.elapsedSeconds),
    })

    this.aiDifficulty    = result.difficulty
    this.speedMultiplier = result.speed_multiplier
    this.gapMultiplier   = result.gap_multiplier
    this.lastAIReason    = result.reason

    const naturalRamp = 1 + this.elapsedSeconds / 300
    this.gameSpeed = BASE_SPEED * this.speedMultiplier * Math.min(naturalRamp, 1.8)

    this.obstacles.getChildren().forEach((o: any) => o.setVelocityX(-this.gameSpeed))
    this.tokens.getChildren().forEach((t: any) => t.setVelocityX(-this.gameSpeed * 0.9))

    this.checkTier()
    this.onAIUpdate?.(this.aiDifficulty, this.speedMultiplier, this.gapMultiplier, result.reason)
  }

  private async die() {
    if (!this.alive) return
    this.alive = false

    this.cameras.main.flash(400, 255, 30, 30, false)
    this.cameras.main.shake(250, 0.015)
    this.obstacles.getChildren().forEach((o: any) => o.setVelocityX(0))
    this.tokens.getChildren().forEach((t: any) => t.setVelocityX(0))

    this.tweens.add({
      targets: this.player, y: this.player.y - 40,
      alpha: 0, angle: 120, scale: 0.3,
      duration: 500, ease: 'Power3',
    })
    this.spawnDeathParticles()

    await recordRunResult({
      player:           this.walletAddress ?? 'demo_player',
      score:            this.score,
      ai_difficulty:    this.aiDifficulty,
      tokens_collected: this.tokensCollected,
      distance:         this.distance,
    })

    this.recentScores.unshift(this.score)
    if (this.recentScores.length > 5) this.recentScores.pop()

    this.time.delayedCall(700, () => {
      this.onGameOver?.({
        score:           this.score,
        tokensCollected: this.tokensCollected,
        distance:        this.distance,
        aiDifficulty:    this.aiDifficulty,
      })
    })
  }

  private checkTier() {
    const newIndex = DIFFICULTY_TIERS.reduce((found, tier, i) =>
      this.aiDifficulty >= tier.minDiff ? i : found, 0)

    if (newIndex !== this.currentTierIndex) {
      this.currentTierIndex = newIndex
      const tier = DIFFICULTY_TIERS[newIndex]
      this.showText(tier.label, tier.color, 1200)
      const bonus = 1 + newIndex * 0.12
      this.gameSpeed = BASE_SPEED * this.speedMultiplier * bonus
      this.obstacles.getChildren().forEach((o: any) => o.setVelocityX(-this.gameSpeed))
      this.tokens.getChildren().forEach((t: any) => t.setVelocityX(-this.gameSpeed * 0.9))
    }
  }

  private spawnJumpParticles() {
    for (let i = 0; i < 4; i++) {
      const p = this.add.image(
        this.player.x + Phaser.Math.Between(-8, 8), this.player.y + 18, 'particle'
      ).setTint(0x00c2ff).setAlpha(0.7).setScale(0.5)
      this.tweens.add({
        targets: p, y: p.y + Phaser.Math.Between(15, 40), alpha: 0, scale: 0,
        duration: Phaser.Math.Between(180, 350), onComplete: () => p.destroy(),
      })
    }
  }

  private spawnTokenParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const p = this.add.image(x, y, 'particle').setTint(0xffaa00).setScale(0.6)
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-40, 40), y: y + Phaser.Math.Between(-40, 20),
        alpha: 0, scale: 0, duration: 350, ease: 'Power2',
        onComplete: () => p.destroy(),
      })
    }
  }

  private spawnDeathParticles() {
    for (let i = 0; i < 16; i++) {
      const p = this.add.image(this.player.x, this.player.y, 'particle')
        .setTint(Phaser.Utils.Array.GetRandom([0xff3355, 0xff8800, 0xffaa00]) as number)
        .setScale(0.8)
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-80, 80), y: p.y + Phaser.Math.Between(-80, 60),
        alpha: 0, scale: 0, duration: Phaser.Math.Between(300, 700), ease: 'Power2',
        onComplete: () => p.destroy(),
      })
    }
  }

  private showText(msg: string, color: string, duration: number) {
    const { width, height } = this.scale
    const t = this.add.text(width / 2, height / 2 - 80, msg, {
      fontFamily: 'Orbitron', fontSize: '18px', color,
    }).setOrigin(0.5)
    this.tweens.add({
      targets: t, y: t.y - 40, alpha: 0, duration,
      onComplete: () => t.destroy(),
    })
  }

  private showReadyText() {
    const { width, height } = this.scale
    const t = this.add.text(width / 2, height / 2,
      'SPACE/TAP = JUMP   ↓/SWIPE DOWN = SLIDE', {
      fontFamily: 'Orbitron', fontSize: '11px', color: '#00c2ff',
    }).setOrigin(0.5).setAlpha(0.7)
    this.time.delayedCall(3000, () => {
      this.tweens.add({ targets: t, alpha: 0, duration: 400, onComplete: () => t.destroy() })
    })
  }

  update() {
    if (!this.alive) return

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!) ||
        Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.doJump()
    }

    if (Phaser.Input.Keyboard.JustDown(this.downKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
      this.doSlide()
    }

    this.obstacles.getChildren().forEach((o: any) => {
      if (o.x < -100) { this.score += o.getData('points') ?? 5; o.destroy() }
    })
    this.tokens.getChildren().forEach((t: any) => {
      if (t.x < -60) t.destroy()
    })

    if (this.player.body && !this.isSliding) {
      const vy = (this.player.body as Phaser.Physics.Arcade.Body).velocity.y
      this.player.setAngle(Phaser.Math.Clamp(vy * 0.025, -18, 18))
    }
  }
}