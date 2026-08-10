import { useEffect, useState } from 'react'

// 서울 시간대별 실제 날씨 — Open-Meteo (API 키 불필요, 브라우저에서 직접 호출 가능).
// 30분 localStorage 캐시로 재방문 시 요청을 아낀다. 실패하면 null을 반환해
// 호출부가 기존 더미 데이터로 폴백한다.
const API_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978' +
  '&hourly=temperature_2m,weather_code&current=temperature_2m,weather_code' +
  '&timezone=Asia%2FSeoul&forecast_days=1'
const CACHE_KEY = 'hy_weather_cache' // { at, data }
const CACHE_MS = 30 * 60 * 1000

// WMO weather code → 아이콘 종류 (sun / cloud / rain)
const iconOf = (code) => {
  if (code == null) return 'sun'
  if (code <= 1) return 'sun'
  if (code <= 48) return 'cloud' // 부분흐림·흐림·안개
  return 'rain' // 이슬비·비·눈·소나기·뇌우
}

// 같은 화면에서 여러 컴포넌트가 동시에 부르면 fetch는 한 번만 나가게 한다
let inflight = null
function fetchWeather() {
  if (!inflight) {
    inflight = fetch(API_URL)
      .then((r) => r.json())
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

// 반환: { current: { temp, icon }, hours: [{ t, temp, icon, now }] } 또는 로딩/실패 시 null
export function useWeather() {
  const [state, setState] = useState(null)

  useEffect(() => {
    let dead = false

    const apply = (raw) => {
      if (!raw?.hourly?.temperature_2m) return
      const nowH = new Date().getHours()
      const slots = [9, 12, 15, 18, 21]
      const nowSlot = slots.reduce((a, b) => (Math.abs(b - nowH) < Math.abs(a - nowH) ? b : a))
      setState({
        current: {
          temp: Math.round(raw.current?.temperature_2m ?? raw.hourly.temperature_2m[nowH]),
          icon: iconOf(raw.current?.weather_code),
        },
        hours: slots.map((h) => ({
          t: `${String(h).padStart(2, '0')}시`,
          temp: `${Math.round(raw.hourly.temperature_2m[h])}°`,
          icon: iconOf(raw.hourly.weather_code?.[h]),
          now: h === nowSlot,
        })),
      })
    }

    const load = (force) => {
      if (!force) {
        try {
          const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
          if (c && Date.now() - c.at < CACHE_MS) {
            apply(c.data)
            return
          }
        } catch {
          /* ignore */
        }
      }
      fetchWeather()
        .then((data) => {
          if (dead) return
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }))
          } catch {
            /* ignore */
          }
          apply(data)
        })
        .catch(() => {
          /* 네트워크 실패 — 더미 폴백 */
        })
    }

    load()
    // 탭을 계속 열어둬도 30분마다, 그리고 탭이 다시 보일 때 갱신한다
    const id = setInterval(() => load(true), CACHE_MS)
    const onVis = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVis)

    return () => {
      dead = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return state
}
