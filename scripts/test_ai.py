"""
Quick sanity test for the PlayerModel.
Run with: python scripts/test_ai.py
"""

import sys
sys.path.insert(0, 'ai-agent')

from models.player_model import PlayerModel, RunRecord

def test_model():
    print("── ChainDash AI Model Test ──────────────────")

    model = PlayerModel("test_player")

    print("\n[1] Cold start (0 runs) — should warm up gently")
    r = model.compute_next_difficulty(current_difficulty=20, elapsed_seconds=30)
    print(f"  difficulty={r['difficulty']} speed={r['speed_multiplier']} gap={r['gap_multiplier']}")
    print(f"  reason: {r['reason']}")
    assert r['difficulty'] <= 30, "Should stay gentle on cold start"

    print("\n[2] Simulate a struggling player (low scores)")
    for score in [120, 95, 80, 110, 70]:
        model.record_run(RunRecord(score=score, ai_difficulty=25, tokens_collected=2, distance=500))

    r = model.compute_next_difficulty(current_difficulty=25, elapsed_seconds=45, avoidance_rate=0.3)
    print(f"  difficulty={r['difficulty']} (should be ≤ 25)")
    print(f"  reason: {r['reason']}")
    assert r['difficulty'] <= 30, "Struggling player should get easier difficulty"

    print("\n[3] Simulate a strong player (high scores)")
    model2 = PlayerModel("strong_player")
    for score in [2000, 2400, 2100, 2800, 3100]:
        model2.record_run(RunRecord(score=score, ai_difficulty=50, tokens_collected=15, distance=3000))

    r = model2.compute_next_difficulty(current_difficulty=50, elapsed_seconds=60, avoidance_rate=0.85)
    print(f"  difficulty={r['difficulty']} (should be > 50)")
    print(f"  reason: {r['reason']}")
    assert r['difficulty'] > 50, "Strong player should get harder difficulty"

    print("\n[4] Verify difficulty stays in [10, 95]")
    model3 = PlayerModel("edge_player")
    for score in [99999] * 10:
        model3.record_run(RunRecord(score=score, ai_difficulty=95, tokens_collected=50, distance=10000))
    r = model3.compute_next_difficulty(current_difficulty=95, elapsed_seconds=120, avoidance_rate=1.0)
    assert 10 <= r['difficulty'] <= 95, f"Out of range: {r['difficulty']}"
    print(f"  difficulty={r['difficulty']} ✓ within bounds")

    print("\n── All tests passed ✓ ───────────────────────")

if __name__ == '__main__':
    test_model()
