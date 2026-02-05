- 콘솔 로그는 항상 ` 디버그 모드 콘솔 온 오프에 합쳐서 개발 (만약 콘솔 로그를 넣어야하는 상황이라면 디버그 때문에)

## General
- 언제나 모바일도 생각해서 개발.
- 최적화 잘돌아가게 최적화 중요.

## Balance Sheet (2026-02-05)

### Applied Changes
- Damage tuning: core turret upgrade +2/Lv, helper upgrade +1/Lv; weapon base damage reduced; enemy damage scales by difficulty.
- Kill DATA reward: base 10 with stage/page scaling (DefenseGame).
- Upgrade caps: max level 100 across core/helper/ally/shield; soft cap after Lv.20 (tail factor 0.25).
- Upgrade costs: level-based scaling with tier bumps and rounding to 5.
- Spawn pacing: page spawn rate uses stage factor and sqrt(diffScale); reinforcement spawn scales by stage; boss phase spawnMultiplier now affects spawn rate.
- Reward scaling: mining clear, conquest reward, loot conversion, drop rates, mining yield, and reputation now scale by stage.

### Current Formulas

Stage base difficulty:
- stageIndex = currentStageId
- if stageIndex == 0 => 0.5
- if stageIndex <= 2 => 1.0
- if stageIndex <= 4 => 1.5
- if stageIndex <= 6 => 2.0
- else => 2.0 + min(1.4, (stageIndex - 6) * 0.07)

Page difficulty + enemy stats:
- pageProgress = (currentPage - 1) / (stageMaxPages - 1)
- difficultyScale = stageBase + pageProgress * (stageDifficultyScale * stageBase * 0.5)
- enemy hp = floor(baseHp * difficultyScale)
- enemy damage = max(6, floor(baseDamage * difficultyScale))
- enemy speed = baseSpeed * difficultyScale

Spawn rate:
- stageFactor = 1 + min(0.5, stageIndex * 0.03)
- diffFactor = sqrt(stageDifficultyScale)
- pageSpawnRate = max(0.16 * pageSpawnScale, (0.42 - page * 0.025 * diffFactor) / stageFactor * pageSpawnScale)
- reinforcementSpawnRate = max(0.08, baseRate / (1 + min(0.4, stageIndex * 0.02))) * pageSpawnScale
  - baseRate = [0.17, 0.12, 0.09] by reinforcement page
- boss phase spawnMultiplier divides spawnRate during boss fight

Kill DATA reward (Defense):
- stageScale = 1 + min(1.5, stageIndex * 0.05)
- pageScale = 1 + min(0.3, pageProgress * 0.3)
- killGain = max(5, round(10 * stageScale * pageScale))

Stage reward scale (GameManager):
- stageScale = 1 + min(1.5, stageIndex * 0.05)
- pageScale = 1 + min(0.3, pageProgress * 0.3)
- defenseRewardScale = stageScale * pageScale
- repScale = 1 + min(1.2, stageIndex * 0.04)

Applied to:
- mining clear: floor(linesCleared * 100 * stageScale)
- conquest reward: floor(10000 * stageScale)
- loot conversion: round(totalData * stageScale)

Drop rates:
- item drop: 0.05 + min(0.08, stageIndex * 0.003) + effects.dropRate
- blueprint drop: 0.10 + min(0.12, stageIndex * 0.004)

Mining yield:
- yieldScale = 1 + min(1.2, stageIndex * 0.04)
- mined = dataPerTrip * yieldScale * minerCount

Upgrade soft cap + cost:
- softCap(level) = level <= 20 ? level : 20 + (level - 20) * 0.25
- upgrade cost scale:
  - tier = floor(level / 10)
  - scale = 1 + level * 0.08 + tier * 0.3
  - cost = max(baseCost, floor((baseCost * scale) / 5) * 5)

Ally slots:
- bonusSlots = floor(softCap(levels.slots, 20, 0.3))
- totalSlots = baseSlots + bonusSlots

### Remaining
- Playtest early/mid/late pacing and tune constants (spawnRate, rewardScale, softCap tail factor).
- When new stages are added, set StageManager difficultyScale/spawnRate/maxPages per stage and re-check curves.
