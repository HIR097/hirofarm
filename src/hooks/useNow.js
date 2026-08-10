import { useEffect, useState } from 'react'

// 분 단위로 갱신되는 현재 시각 — 탭을 계속 열어둬도 자정이 지나면
// 날짜 라벨·주간 달력이 자동으로 넘어간다. 탭이 다시 보일 때도 즉시 갱신.
export function useNow(intervalMs = 60 * 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, intervalMs)
    const onVis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [intervalMs])
  return now
}
