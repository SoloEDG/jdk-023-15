export interface ContactEvent {
  id: string
  x: number
  y: number
  speed: number
  /** 这一次接触瞬间的撞击速度（碰撞前的接近速度），只代表当前这一击，不做跨帧平均 */
  impact: number
}

export interface RideSample {
  x: number
  y: number
  vx: number
  vy: number
}

export interface RideFns {
  ramp: (progress: number) => RideSample
  scoop: (progress: number) => RideSample
}

export function dedupeContacts(events: ContactEvent[]): ContactEvent[] {
  const kept = new Map<string, ContactEvent>()
  for (const event of events) {
    const previous = kept.get(event.id)
    if (!previous || event.speed > previous.speed) kept.set(event.id, event)
  }
  return [...kept.values()]
}
