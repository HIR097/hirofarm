import { useState, useEffect, useCallback } from 'react'
import { WORK_ASSETS } from '../data/worklog.js'

// ─────────────────────────────────────────────────────────────
// 업무현황 저장소.
// worklog.js 의 WORK_ASSETS 를 시드로 쓰되, 사용자가 추가/이동한 결과는
// localStorage 에 보존한다. 각 업무에 안정적인 id 를 부여해 드래그 이동 ·
// 삭제가 가능하도록 한다.
// ─────────────────────────────────────────────────────────────

const KEY = 'hy_work_v2'

let idCounter = 0
function genId(prefix = 't') {
  idCounter += 1
  const rand = Math.random().toString(36).slice(2, 7)
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${rand}`
}

// 시드 데이터에 id 부여 (펀드 컬럼/카드 식별용).
function seed() {
  return WORK_ASSETS.map((a) => ({
    ...a,
    tasks: a.tasks.map((t, i) => ({ id: `seed-${a.key}-${i}`, ...t })),
  }))
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* ignore */
  }
  return seed()
}

export function useWorkStore() {
  const [assets, setAssets] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(assets))
    } catch {
      /* ignore */
    }
  }, [assets])

  // 새 업무 추가 (+ 버튼 / 메일 제안 공통).
  const addTask = useCallback((key, task) => {
    setAssets((prev) =>
      prev.map((a) => (a.key === key ? { ...a, tasks: [...a.tasks, { id: genId(), ...task }] } : a)),
    )
  }, [])

  const removeTask = useCallback((id) => {
    setAssets((prev) => prev.map((a) => ({ ...a, tasks: a.tasks.filter((t) => t.id !== id) })))
  }, [])

  const toggleUrgent = useCallback((id) => {
    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        tasks: a.tasks.map((t) => (t.id === id ? { ...t, urgent: !t.urgent } : t)),
      })),
    )
  }, [])

  // 업무를 다른(또는 같은) 펀드 컬럼으로 이동. beforeId 가 있으면 그 카드 앞에 삽입,
  // 없으면 컬럼 맨 끝에 추가.
  const moveTask = useCallback((id, toKey, beforeId = null) => {
    setAssets((prev) => {
      let moved = null
      const stripped = prev.map((a) => {
        const idx = a.tasks.findIndex((t) => t.id === id)
        if (idx === -1) return a
        moved = a.tasks[idx]
        return { ...a, tasks: a.tasks.filter((t) => t.id !== id) }
      })
      if (!moved) return prev
      return stripped.map((a) => {
        if (a.key !== toKey) return a
        const tasks = [...a.tasks]
        if (beforeId && beforeId !== id) {
          const bi = tasks.findIndex((t) => t.id === beforeId)
          if (bi === -1) tasks.push(moved)
          else tasks.splice(bi, 0, moved)
        } else {
          tasks.push(moved)
        }
        return { ...a, tasks }
      })
    })
  }, [])

  const reset = useCallback(() => setAssets(seed()), [])

  return { assets, addTask, removeTask, toggleUrgent, moveTask, reset }
}
