import { useState, useEffect, useCallback } from 'react'
import { fetchMailSuggestions, isLiveMail } from '../lib/outlook.js'
import {
  isMsalConfigured,
  signIn as msalSignIn,
  signOut as msalSignOut,
  restoreSession,
} from '../lib/msalAuth.js'

// Outlook 메일 제안 목록 + 로그인 상태. 패널에서 검토 후 추가/무시할 수 있다.
export function useMailSuggestions() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(isLiveMail())
  const [authBusy, setAuthBusy] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    fetchMailSuggestions()
      .then((s) => setSuggestions(s))
      .catch(() => setSuggestions([]))
      .finally(() => {
        setLoading(false)
        setLive(isLiveMail())
      })
  }, [])

  // 최초 1회: 이전 로그인 세션이 있으면 팝업 없이 토큰을 복구한 뒤 메일 로드.
  useEffect(() => {
    let alive = true
    restoreSession()
      .catch(() => null)
      .finally(() => {
        if (alive) refresh()
      })
    return () => {
      alive = false
    }
  }, [refresh])

  // Outlook 로그인(팝업) → 토큰 발급 → 실제 메일 로드.
  const signIn = useCallback(async () => {
    setAuthBusy(true)
    try {
      await msalSignIn()
      refresh()
    } catch (e) {
      console.warn('[outlook] 로그인 실패:', e?.message || e)
    } finally {
      setAuthBusy(false)
    }
  }, [refresh])

  // 로그아웃 → 데모로 복귀.
  const signOut = useCallback(async () => {
    setAuthBusy(true)
    try {
      await msalSignOut()
      refresh()
    } finally {
      setAuthBusy(false)
    }
  }, [refresh])

  // 제안 카드의 편집 가능한 값(대상 펀드/일자/긴급) 갱신.
  const update = useCallback((id, patch) => {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const dismiss = useCallback((id) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return {
    suggestions,
    loading,
    live,
    configured: isMsalConfigured(),
    authBusy,
    refresh,
    update,
    dismiss,
    signIn,
    signOut,
  }
}
