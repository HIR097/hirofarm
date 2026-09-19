import { useEffect, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { Card, mono } from '../components/ui.jsx'
import * as sync from '../lib/sync.js'
import { generateDailyNote, loadNotes, saveNotes, mergeNotes, todayIso, tabLabel, SYNC_KEY } from '../lib/cryptoAI.js'
import { Markdown, SubTabs, btn } from './Holdem.jsx'

// 크립토 — The Block 뉴스를 읽기 전에 토플 기준 어휘·문법을 먼저 공부하는 탭 (홀덤 탭과 같은 구조).
// 두 종류의 문서가 섞여 보인다:
//   ① 저장소 문서: public/crypto/index.json 의 days(날짜별) + guides(기초 용어·읽는 법). 커밋으로 배포.
//   ② 생성 노트: 우상단 "오늘 뉴스로 업데이트" → src/lib/cryptoAI.js 가 Claude(web_fetch)로 만든 마크다운.
//      localStorage hy_crypto_notes 에 날짜별 저장, 동기화 켜져 있으면 Supabase 'crypto_notes' 로 폰·PC 공유.
//      같은 날짜가 저장소에도 있으면 생성본이 우선(더 최신).
// 읽음 체크는 localStorage hy_crypto_done.

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const newer = (a, b) => !b || (a || '') > b

export default function Crypto() {
  const mobile = useIsMobile()
  const [index, setIndex] = useState(null)
  const [err, setErr] = useState('')
  const [cur, setCur] = useLocalStorage('hy_crypto_doc', '')
  const [doneStr, setDoneStr] = useLocalStorage('hy_crypto_done', '{}')
  const [text, setText] = useState('')
  const [notes, setNotesState] = useState(loadNotes)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [stamp, setStamp] = useLocalStorage('hy_crypto_stamp', '')
  const done = (() => { try { return JSON.parse(doneStr) || {} } catch { return {} } })()

  const setNotes = (n) => { setNotesState(n); saveNotes(n) }

  // ── 저장소 목록 ──
  useEffect(() => {
    fetch('/crypto/index.json?cb=' + Date.now()).then((r) => r.json()).then(setIndex).catch((e) => setErr('목록을 못 불러왔다: ' + e.message))
  }, [])

  // ── 동기화: 열 때 pull (최신 stamp 승), 생성 직후 push ──
  const stampRef = useRef(stamp); stampRef.current = stamp
  useEffect(() => {
    const pull = async () => {
      if (!sync.isConfigured() || !sync.isLoggedIn()) return
      try {
        const remote = await sync.pull(SYNC_KEY)
        if (remote && newer(remote.updatedAt, stampRef.current) && remote.value && typeof remote.value === 'object') {
          setNotes(mergeNotes(loadNotes(), remote.value.notes || {}))
          setStamp(remote.updatedAt)
        }
      } catch { /* 조용히 */ }
    }
    pull()
    const onVis = () => { if (document.visibilityState === 'visible') pull() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const push = async (n) => {
    if (!sync.isConfigured() || !sync.isLoggedIn()) return
    try {
      const now = new Date().toISOString()
      await sync.push(SYNC_KEY, { notes: n }, now)
      setStamp(now)
    } catch (e) { setStatus((s) => s + ` · 동기화 실패: ${e.message}`) }
  }

  // ── 문서 목록 = 생성 노트(최신 앞) ∪ 저장소 days ∪ guides ──
  const gen = Object.values(notes).sort((a, b) => (b.date > a.date ? 1 : -1))
  const repoDays = (index?.days || []).filter((d) => !notes[d.id])
  const days = [
    ...gen.map((n) => ({ id: n.date, tab: tabLabel(n.date) + ' ✦', title: n.title, articles: n.articles, words: n.words, local: true })),
    ...repoDays,
  ].sort((a, b) => (b.id > a.id ? 1 : -1))
  const docs = [...days, ...(index?.guides || [])]
  const doc = docs.find((c) => c.id === cur)

  useEffect(() => {
    if (!index) return
    if (!cur || !docs.some((d) => d.id === cur)) { if (docs[0]) setCur(docs[0].id); return }
    if (doc?.local) { setText(notes[cur].md); return }
    let alive = true
    setText('')
    fetch(`/crypto/${cur}.md?cb=` + Date.now()).then((r) => r.text()).then((t) => alive && setText(t)).catch(() => alive && setText('# 불러오기 실패'))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, index, notes])

  const toggleDone = () => setDoneStr(JSON.stringify({ ...done, [cur]: !done[cur] }))

  // ── 오늘 뉴스로 업데이트 ──
  const update = async () => {
    if (busy) return
    const date = todayIso()
    if (notes[date] && !window.confirm(`${tabLabel(date)} 노트가 이미 있습니다. 다시 만들까요? (API 비용이 듭니다)`)) return
    setBusy(true); setErr(''); setStatus('시작…')
    try {
      const note = await generateDailyNote({ date, onStatus: setStatus })
      const n = mergeNotes(notes, { [date]: note })
      setNotes(n); setCur(date)
      await push(n)
    } catch (e) {
      setErr(e.message || '실패')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }
  const remove = () => {
    if (!doc?.local || !window.confirm(`${doc.tab} 생성 노트를 지울까요?`)) return
    const n = { ...notes }; delete n[cur]; setNotes(n); push(n); setCur('')
  }
  const copy = async () => { try { await navigator.clipboard.writeText(text); setStatus('마크다운을 복사했다 — public/crypto/ 에 붙여 넣고 커밋하면 영구 보관') } catch { setStatus('복사 실패') } }

  return (
    <div style={fade}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, margin: '4px 0 16px' }}>
        <div style={{ font: mono, color: 'var(--text-3)' }}>
          {index ? `${index.source} · 어휘 노트 ${days.length}일${gen.length ? ` (생성 ${gen.length})` : ''} · 읽음 ${Object.values(done).filter(Boolean).length}` : ''}
          {status ? ` · ${status}` : ''}
        </div>
        <button onClick={update} disabled={busy} style={{ ...btn(true), opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer', padding: '7px 14px' }}>
          {busy ? '만드는 중…' : '↻ 오늘 뉴스로 업데이트'}
        </button>
      </div>
      {err && <Card style={{ marginBottom: 12 }}><div style={{ color: 'var(--danger, #e5484d)', fontSize: 14 }}>{err}</div></Card>}
      {index && (
        <>
          <SubTabs value={cur} onChange={setCur} items={docs.map((c) => [c.id, `${c.tab}${done[c.id] ? ' ✓' : ''}`])} />
          {doc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ font: mono, color: 'var(--text-3)' }}>
                {doc.title}{doc.articles ? ` · 기사 ${doc.articles}개` : ''}{doc.words ? ` · 어휘 ${doc.words}개` : ''}{doc.local ? ' · ✦ 생성 노트' : ''}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                {doc.local && <button onClick={copy} style={btn(false)}>md 복사</button>}
                {doc.local && <button onClick={remove} style={btn(false)}>삭제</button>}
                <button onClick={toggleDone} style={btn(!!done[cur])}>{done[cur] ? '읽음 ✓' : '읽음으로 표시'}</button>
              </span>
            </div>
          )}
          <Card style={{ padding: mobile ? '16px 16px' : '22px 26px' }}>
            {text ? <Markdown text={text} mobile={mobile} /> : <div style={{ font: mono, color: 'var(--text-3)' }}>여는 중…</div>}
          </Card>
          <div style={{ font: mono, color: 'var(--text-3)', marginTop: 10, fontSize: 11 }}>
            업데이트 버튼은 홈 탭 "AI 설정"의 Anthropic 키를 쓴다. 한 번에 기사 6~7편을 읽어 1~3분 걸리고, 비용은 회당 약 $0.3~0.5. 생성 노트(✦)는 이 기기와 동기화 계정에 저장되며, "md 복사"로 저장소에 옮기면 영구 보관된다.
          </div>
        </>
      )}
    </div>
  )
}
