import type { RunResult } from '../App'

interface Props {
  result:        RunResult
  wallet:        string | null
  isGuest:       boolean
  onPlayAgain:   () => void
  onMenu:        () => void
  onLeaderboard: () => void
}

export default function GameOver({ result, wallet, isGuest, onPlayAgain, onMenu, onLeaderboard }: Props) {
  const aiLabel = result.aiDifficulty < 30 ? 'EASY'
                : result.aiDifficulty < 60 ? 'MEDIUM'
                : result.aiDifficulty < 80 ? 'HARD'
                : 'EXTREME'

  return (
    <div className="gameover-root">
      <div className="gameover-bg" />
      <div className="gameover-panel">
        <div className="gameover-title">GAME OVER</div>

        {result.isNewBest && (
          <div className="gameover-new-best">✦ NEW PERSONAL BEST ✦</div>
        )}

        <div className="gameover-score">
          <div className="gameover-score-num">{result.score.toLocaleString()}</div>
          <div className="gameover-score-label">SCORE</div>
        </div>

        <div className="gameover-stats">
          <div className="go-stat">
            <div className="go-stat-val">{result.tokensCollected}</div>
            <div className="go-stat-lbl">TOKENS</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-val">{result.distance}m</div>
            <div className="go-stat-lbl">DISTANCE</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-val">{result.aiDifficulty}</div>
            <div className="go-stat-lbl">AI LEVEL</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-val">{aiLabel}</div>
            <div className="go-stat-lbl">DIFFICULTY</div>
          </div>
        </div>

        {/* Chain submission status */}
        <div className="gameover-chain-note">
          {wallet && !isGuest ? (
            <span className="chain-note--success">
              ⬡ Score submitted to OneChain testnet
            </span>
          ) : (
            <span className="chain-note--guest">
              ◈ Guest score — not recorded on-chain.{' '}
              <strong>Connect wallet</strong> for leaderboard access.
            </span>
          )}
        </div>

        <div className="gameover-actions">
          <button className="btn-primary" onClick={onPlayAgain}>
            <span className="btn-icon">▶</span> PLAY AGAIN
          </button>
          {!isGuest && (
            <button className="btn-secondary" onClick={onLeaderboard}>
              LEADERBOARD
            </button>
          )}
          <button className="btn-secondary" onClick={onMenu}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}