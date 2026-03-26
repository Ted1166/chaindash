import Phaser from 'phaser'

export default class UIScene extends Phaser.Scene {
  private shieldIcon!: Phaser.GameObjects.Text

  constructor() { super({ key: 'UIScene', active: false }) }

  create() {
    this.shieldIcon = this.add.text(16, 60, '🛡 SHIELD', {
      fontFamily: 'Share Tech Mono',
      fontSize:   '13px',
      color:      '#00c2ff',
    }).setAlpha(0)
  }

  showShield(active: boolean) {
    this.tweens.add({
      targets:  this.shieldIcon,
      alpha:    active ? 1 : 0,
      duration: 200,
    })
  }
}