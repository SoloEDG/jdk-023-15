import type { ContactEvent } from '@/shared/contacts'
import { findMechanism, type PinballDocument } from '@/shared/document'
import { BodyId } from '@/shared/ids'
import { cooldownFor } from '@/features/table'

const BASE_POINTS: Record<string, number> = {
  [BodyId.bumperA]: 100,
  [BodyId.bumperB]: 100,
  [BodyId.bumperC]: 120,
  [BodyId.slingL]: 15,
  [BodyId.slingR]: 15,
  [BodyId.dropA]: 500,
  [BodyId.dropB]: 500,
  [BodyId.dropC]: 500,
  [BodyId.spinner]: 40,
  [BodyId.laneL]: 25,
  [BodyId.laneC]: 25,
  [BodyId.laneR]: 25,
  [BodyId.hole]: 250,
  [BodyId.ramp]: 1000,
}

const NAME: Record<string, string> = {
  [BodyId.bumperA]: '左弹力柱',
  [BodyId.bumperB]: '中弹力柱',
  [BodyId.bumperC]: '右弹力柱',
  [BodyId.slingL]: '左弹射',
  [BodyId.slingR]: '右弹射',
  [BodyId.dropA]: '落靶',
  [BodyId.dropB]: '落靶',
  [BodyId.dropC]: '落靶',
  [BodyId.spinner]: '转轮',
  [BodyId.laneL]: '左通道',
  [BodyId.laneC]: '中通道',
  [BodyId.laneR]: '右通道',
  [BodyId.hole]: '回球洞',
  [BodyId.ramp]: '坡道',
}

/** 撞击速度低于该值时没有速度加成，很慢的命中只拿基础分 */
const SPEED_FLOOR = 60
/** 撞击速度达到该值时速度加成封顶，再快也不增加 */
const SPEED_CAP = 1200
/** 速度加成最多相当于基础分的一半 */
const MAX_BONUS_RATIO = 0.5

export interface ScoreBreakdown {
  base: number
  speedBonus: number
  multiplier: number
  subtotal: number
  points: number
}

/** 只根据这一击的撞击速度计算速度加成（倍率前），慢速为 0、高速封顶并取整 */
export function speedBonusFor(base: number, impact: number): number {
  if (!Number.isFinite(impact) || impact <= SPEED_FLOOR) return 0
  const ratio = Math.min(1, (impact - SPEED_FLOOR) / (SPEED_CAP - SPEED_FLOOR))
  return Math.round(base * MAX_BONUS_RATIO * ratio)
}

/**
 * 拆出基础分与速度加成：
 * 先把两者相加，奖励倍率只乘在加总结果上一次，不会把速度加成乘第二遍。
 * 只有真正接触产生的事件才会走到这里（见碰撞解析与去重逻辑）。
 */
export function breakdownFor(id: string, impact: number, multiplier: number): ScoreBreakdown | null {
  const base = BASE_POINTS[id]
  if (base === undefined) return null
  const speedBonus = speedBonusFor(base, impact)
  const subtotal = base + speedBonus
  return {
    base,
    speedBonus,
    multiplier,
    subtotal,
    points: subtotal * multiplier,
  }
}

function remember(doc: PinballDocument, id: string, score: ScoreBreakdown): void {
  doc.feedSeq += 1
  doc.feed.unshift({
    uid: doc.feedSeq,
    name: NAME[id] ?? '撞击',
    base: score.base,
    speedBonus: score.speedBonus,
    multiplier: score.multiplier,
    points: score.points,
  })
  if (doc.feed.length > 6) doc.feed.length = 6
}

export function applyScore(doc: PinballDocument, events: ContactEvent[]): ContactEvent[] {
  const awarded: ContactEvent[] = []
  for (const event of events) {
    const mechanism = findMechanism(doc, event.id)
    if (mechanism && mechanism.cooldownMs > 0) continue
    // 用这一次接触的撞击速度计分，不与前后几帧、旁边的球做平均
    const score = breakdownFor(event.id, event.impact, doc.chain.multiplier)
    if (score === null) continue
    doc.score += score.points
    remember(doc, event.id, score)
    if (mechanism) mechanism.cooldownMs = cooldownFor(mechanism.kind)
    awarded.push(event)
  }
  return awarded
}
