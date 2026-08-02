import { useEffect, useState } from 'react'

// 모바일 여부. 레이아웃 분기용 — 인라인 스타일이라 미디어쿼리 대신 JS로 판단한다.
export function useIsMobile(maxWidth = 760) {
  const query = `(max-width: ${maxWidth}px)`
  const [isMobile, setIsMobile] = useState(() => {
    try {
      return window.matchMedia(query).matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    let mq
    try {
      mq = window.matchMedia(query)
    } catch {
      return
    }
    const onChange = (e) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
