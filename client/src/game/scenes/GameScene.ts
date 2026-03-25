import Phaser from 'phaser'
import { useGameStore } from '../../hooks/useGameStore'
import { fetchDifficulty, registerRunResult } from '../../ai/client'

// Obstacle type enum
type ObstacleType = 'spike' | 'fork' | 'rug' | 'node'

interface ObstacleConfig {
  type: ObstacleType
  texture: string
  width: number
  height: number
  /** y offset from ground surface */
  yOffset: number
}

const OBSTACLE_CONFIGS: ObstacleConfig[] = [
  { type: 'spike', texture: 'obstacle_spike', width: 40, height: 60, yOffset: 60 },
  { type: 'fork',  texture: 'obstacle_fork',  width: 50, height: 40, yOffset: 40 },
  { type: 'rug',   texture: 'obstacle_rug',   width: 80, height: 18, yOffset: 18 },
  { type: 'node',  texture: 'obstacle_node',  width: 48, height: 48, yOffset: 48 },
]

export class GameScene extends Phaser.Scene {
  // ── Game objects ─────────────────────────────────────────────────────────────
  private player!: Phaser.Physics.Arcade.Sprite
  private ground!: Phaser.Physics.Arcade.StaticGroup
  private obstacles!: Phaser.Physics.Arcade.Group
  private tokens!: Phaser.Physics.Arcade.Group
//   private _bg!: Phaser.GameObjects.Image

  // ── Input ────────────────────────────────────────────────────────────────────
  private jumpKey!: Phaser.Input.Keyboard.Key
  private jumpCount = 0

  // ── Game state ───────────────────────────────────────────────────────────────
  private score = 0
  private tokensCollected = 0
  private distance = 0
  private alive = true

  // ── AI difficulty state ──────────────────────────────────────────────────────
  private aiDifficulty = 20           // 0–100
  private speedMultiplier = 1.0
  private gapMultiplier = 1.0
  private aiPollTimer = 0
  private readonly AI_POLL_INTERVAL = 5000 // ms

  // ── Spawn timers ──────────────────────────────────────────────────────────────
  private obstacleTimer!: Phaser.Time.TimerEvent
//   private _tokenTimer!: Phaser.Time.TimerEvent
//   private _scoreTimer!: Phaser.Time.TimerEvent

  // ── Base speed (px/s) ─────────────────────────────────────────────────────────
  private get baseSpeed() {
    return 280 + (this.aiDifficulty / 100) * 220
  }

  // ── Obstacle spawn interval (ms) ──────────────────────────────────────────────
  private get spawnInterval() {
    // Between 1.2 s (hardest) and 2.5 s (easiest)
    return Math.max(1200, 2500 - this.aiDifficulty * 13) / this.speedMultiplier
  }

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const store = useGameStore.getState()
    store.startRun()

    // Background
    // this._bg = this.add.image(0, 0, 'bg').setOrigin(0, 0)

    // Ground
    this.ground = this.physics.add.staticGroup()
    const groundY = 620
    const g = this.ground.create(240, groundY, 'ground') as Phaser.Physics.Arcade.Sprite
    g.setDisplaySize(480, 20)
    g.refreshBody()

    // Player
    this.player = this.physics.add.sprite(80, groundY - 50, 'player')
    this.player.setBounce(0.05)
    this.player.setCollideWorldBounds(true)
    this.player.setGravityY(200)

    // Groups
    this.obstacles = this.physics.add.group()
    this.tokens = this.physics.add.group()

    // Collisions
    this.physics.add.collider(this.player, this.ground)
    this.physics.add.collider(this.obstacles, this.ground)

    this.physics.add.overlap(this.player, this.obstacles, () => this.handleDeath())
    this.physics.add.overlap(this.player, this.tokens, (_, token) => {
      (token as Phaser.GameObjects.GameObject).destroy()
      this.tokensCollected++
      useGameStore.getState().updateTokens(this.tokensCollected)
    })

    // Input
    this.jumpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.input.on('pointerdown', () => this.doJump())
    this.jumpKey.on('down', () => this.doJump())

    // Timers
    this.scheduleObstacleSpawn()
    // this._tokenTimer = this.time.addEvent({
    //   delay: 1800,
    //   callback: this.spawnToken,
    //   callbackScope: this,
    //   loop: true,
    // })
    // this._scoreTimer = this.time.addEvent({
    //   delay: 100,
    //   callback: () => {
    //     if (!this.alive) return
    //     this.score += Math.floor(1 + this.aiDifficulty / 20)
    //     this.distance += Math.floor(this.baseSpeed * 0.1)
    //     useGameStore.getState().updateScore(this.score)
    //     useGameStore.getState().updateDistance(this.distance)
    //   },
    //   loop: true,
    // })

    // Start UIScene in parallel for HUD
    this.scene.launch('UIScene')
  }

  update(_time: number, delta: number) {
    if (!this.alive) return

    // Scroll obstacles and tokens leftward
    const speed = this.baseSpeed * (delta / 1000)
    this.obstacles.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite
      s.x -= speed
      if (s.x < -100) s.destroy()
    })
    this.tokens.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite
      s.x -= speed
      if (s.x < -50) s.destroy()
    })

    // Reset jump count when grounded
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (body.blocked.down) this.jumpCount = 0

    // Poll AI every AI_POLL_INTERVAL ms
    this.aiPollTimer += delta
    if (this.aiPollTimer >= this.AI_POLL_INTERVAL) {
      this.aiPollTimer = 0
      this.pollAI()
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  private doJump() {
    if (!this.alive) return
    // const body = this.player.body as Phaser.Physics.Arcade.Body
    if (this.jumpCount < 2) {
      this.player.setVelocityY(-700)
      this.jumpCount++
    }
  }

  private scheduleObstacleSpawn() {
    this.obstacleTimer?.destroy()
    this.obstacleTimer = this.time.addEvent({
      delay: this.spawnInterval,
      callback: () => {
        this.spawnObstacle()
        this.scheduleObstacleSpawn() // reschedule to pick up updated interval
      },
      callbackScope: this,
    })
  }

  private spawnObstacle() {
    if (!this.alive) return

    const config = Phaser.Utils.Array.GetRandom(OBSTACLE_CONFIGS) as ObstacleConfig
    const groundY = 620
    const y = groundY - config.yOffset / 2

    const obs = this.physics.add.sprite(520, y, config.texture)
    this.obstacles.add(obs)
    obs.setDisplaySize(
    config.width * this.gapMultiplier,
    config.height * this.gapMultiplier,
    )
    obs.setImmovable(true)
    ;(obs.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)


    // Rug pull: flash and disappear after 1 s
    if (config.type === 'rug') {
      this.time.delayedCall(1000, () => {
        this.tweens.add({ targets: obs, alpha: 0, duration: 300, onComplete: () => obs.destroy() })
      })
    }
  }

  protected spawnToken() {
    if (!this.alive) return
    const groundY = 620
    const heights = [groundY - 80, groundY - 150, groundY - 220]
    const y = Phaser.Utils.Array.GetRandom(heights)
    const token = this.physics.add.sprite(530, y, 'token')
    this.tokens.add(token)
    ;(token.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
  }

  private handleDeath() {
    if (!this.alive) return
    this.alive = false

    this.player.setTint(0xff4444)
    this.player.setVelocityY(-400)
    this.cameras.main.shake(300, 0.015)

    // Notify AI engine about this run
    const store = useGameStore.getState()
    registerRunResult(
      '', // player address filled in by the React layer
      this.score,
      this.aiDifficulty,
      this.tokensCollected,
      this.distance,
    )

    store.endRun({
      score: this.score,
      tokensCollected: this.tokensCollected,
      distance: this.distance,
      aiDifficulty: this.aiDifficulty,
      newPersonalBest: false, // will be set by the store
    })

    this.time.delayedCall(800, () => {
      const onGameOver = this.registry.get('onGameOver') as () => void
      onGameOver?.()
    })
  }

  // ── AI integration ────────────────────────────────────────────────────────────

  private async pollAI() {
    const store = useGameStore.getState()
    const response = await fetchDifficulty({
      player: '', // filled by React context — omitted here for Phaser isolation
      recent_scores: [],
      reaction_percentile: 50,
      avoidance_rate: 0.5,
      current_difficulty: this.aiDifficulty,
      elapsed_seconds: Math.floor(this.distance / this.baseSpeed),
    })

    this.aiDifficulty = response.difficulty
    this.speedMultiplier = response.speed_multiplier
    this.gapMultiplier = response.gap_multiplier

    store.setAiDifficulty(this.aiDifficulty)
  }
}
