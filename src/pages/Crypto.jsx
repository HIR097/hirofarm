import { useEffect, useMemo, useRef, useState } from 'react'
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
// 읽음 체크는 localStorage hy_crypto_done. 어휘 퀴즈(전부 맞히면 자동 읽음) 진행은 hy_crypto_quiz.

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const newer = (a, b) => !b || (a || '') > b

// ── 어휘 퀴즈 ──
// 노트의 어휘 표(| **단어** | 품사 | 뜻 | 예문 |)를 모아 4지선다로 낸다. 유형 3가지(단어→뜻, 뜻→단어, 예문 빈칸).
// 틀린 문항은 큐 뒤로 다시 들어가고, 전부 맞혀 큐가 비면 그 날짜를 자동으로 "읽음 ✓" 처리한다.
// 진행 상태는 localStorage hy_crypto_quiz { [date]: { left: [단어...], wrong: n, total: n } } 에 남아 이어서 풀 수 있다.
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export function parseVocab(md) {
  const out = []
  let section = ''
  for (const line of md.split('\n')) {
    const h = /^##\s+(.+)/.exec(line)
    if (h) { section = h[1].trim(); continue }
    const m = /^\|\s*\*\*(.+?)\*\*\s*\|\s*([^|]*)\|\s*([^|]+)\|\s*([^|]+)\|\s*$/.exec(line)
    if (!m) continue
    const [, word, pos, ko, ex] = m.map((x) => (x || '').trim())
    if (!ko || !ex || ko === '---') continue
    if (out.some((o) => o.word === word)) continue
    out.push({ word, pos, ko, ex, section: section.replace(/^\d+\.\s*/, '') })
  }
  return out
}
// 예문에서 단어(구)의 첫 단어를 찾아 빈칸으로. 못 찾으면 null.
function blankOf(ex, word) {
  const first = word.replace(/\(.*?\)/g, ' ').replace(/\b(A|B|something|someone)\b/g, ' ').trim().split(/\s+/).filter((w) => w.length > 2)[0]
  if (!first) return null
  const m = new RegExp('\\b' + esc(first.replace(/[^\w']/g, '')) + "[\\w']*", 'i').exec(ex)
  if (!m) return null
  return ex.slice(0, m.index) + '______' + ex.slice(m.index + m[0].length)
}
function makeQ(item, pool) {
  const others = shuffle(pool.filter((o) => o.word !== item.word)).slice(0, 3)
  const kinds = ['ko', 'word']
  const blank = blankOf(item.ex, item.word)
  if (blank) kinds.push('blank')
  const kind = kinds[Math.floor(Math.random() * kinds.length)]
  const opts = shuffle([item, ...others]).map((o) => ({ key: o.word, label: kind === 'ko' ? o.ko : o.word }))
  return { item, kind, blank, opts }
}

function CryptoQuiz({ date, text, mobile, onDone, onClose }) {
  const pool = useMemo(() => parseVocab(text), [text])
  const [progStr, setProgStr] = useLocalStorage('hy_crypto_quiz', '{}')
  const prog = (() => { try { return JSON.parse(progStr) || {} } catch { return {} } })()
  const saved = prog[date]
  const fresh = () => ({ left: shuffle(pool.map((p) => p.word)), wrong: 0, total: pool.length })
  const [st, setSt] = useState(() => (saved && saved.left && saved.total === pool.length ? saved : fresh()))
  const [q, setQ] = useState(null)
  const [picked, setPicked] = useState(null)
  const [okCount, setOkCount] = useState(0)
  const save = (n) => { setSt(n); setProgStr(JSON.stringify({ ...prog, [date]: n })) }
  const byWord = useMemo(() => Object.fromEntries(pool.map((p) => [p.word, p])), [pool])
  const finished = st.left.length === 0 && pool.length > 0

  useEffect(() => {
    if (finished) { onDone(); return }
    const item = byWord[st.left[0]]
    if (!item) { save(fresh()); return }
    setQ(makeQ(item, pool)); setPicked(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.left[0], st.left.length, pool])

  const answer = (o) => {
    if (picked || !q) return
    setPicked(o)
    if (o.key === q.item.word) setOkCount((c) => c + 1)
  }
  const next = () => {
    if (!picked || !q) return
    const ok = picked.key === q.item.word
    const rest = st.left.slice(1)
    // 틀리면 큐 뒤쪽(3~6문제 뒤)에 다시 넣는다
    let left = rest
    if (!ok) { const at = Math.min(rest.length, 3 + Math.floor(Math.random() * 4)); left = [...rest]; left.splice(at, 0, q.item.word) }
    save({ ...st, left, wrong: st.wrong + (ok ? 0 : 1) })
  }
  const restart = () => { if (window.confirm('이 날짜 퀴즈를 처음부터 다시 풀까요?')) { save(fresh()); setOkCount(0) } }

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      if (!picked && q && /^[1-4]$/.test(e.key)) { const o = q.opts[Number(e.key) - 1]; if (o) { e.preventDefault(); answer(o) } }
      else if (picked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (pool.length < 4) return <Card><div style={{ color: 'var(--text-2)', fontSize: 14 }}>이 노트에는 어휘 표가 없어 퀴즈를 낼 수 없다.</div></Card>
  const doneN = st.total - st.left.length
  const optBtn = (o) => {
    const isAns = picked && o.key === q.item.word
    const isWrong = picked && o.key === picked.key && o.key !== q.item.word
    return {
      font: `${q.kind === 'ko' ? 500 : 600} ${mobile ? 14 : 16}px 'Pretendard Variable'`, padding: mobile ? '10px 12px' : '13px 16px', borderRadius: 10, cursor: picked ? 'default' : 'pointer', textAlign: 'left',
      border: '1px solid ' + (isAns ? 'var(--accent)' : isWrong ? '#e5484d' : 'var(--line)'),
      background: isAns ? 'var(--accent)' : isWrong ? 'rgba(229,72,77,.18)' : 'var(--surface2)',
      color: isAns ? 'var(--accent-text)' : 'var(--text)', position: 'relative', paddingLeft: 30,
    }
  }
  const prompt = !q ? '' : q.kind === 'ko' ? q.item.word : q.kind === 'word' ? q.item.ko : q.blank
  const ask = !q ? '' : q.kind === 'ko' ? '이 단어의 뜻은?' : q.kind === 'word' ? '이 뜻의 단어는?' : '빈칸에 들어갈 단어는?'
  return (
    <Card style={{ padding: mobile ? 14 : 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14, font: mono, color: 'var(--text-3)' }}>
        <span>{doneN}/{st.total} 통과</span>
        <span style={{ flex: 1, height: 4, background: 'var(--surface2)', borderRadius: 2, minWidth: 80, overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: `${st.total ? doneN / st.total * 100 : 0}%`, background: 'var(--accent)' }} />
        </span>
        <span style={{ color: st.wrong ? '#e5484d' : 'var(--text-3)' }}>틀림 {st.wrong}</span>
        <span>이번 정답 {okCount}</span>
        <button onClick={restart} style={btn(false)}>다시</button>
        <button onClick={onClose} style={btn(false)}>노트로</button>
      </div>
      {finished ? (
        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--accent)', color: 'var(--accent-text)', animation: 'hyFade .3s ease' }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>완료 ✓ 어휘 {st.total}개 전부 통과</div>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 2 }}>틀린 횟수 {st.wrong}. 이 날짜는 읽음으로 표시됨. "다시"를 누르면 처음부터.</div>
        </div>
      ) : q && (
        <>
          <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 6 }}>{q.item.section} · {ask} · 키보드 1~4</div>
          <div style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.45, marginBottom: 14, color: q.kind === 'blank' ? 'var(--text)' : 'var(--accent)' }}>
            {prompt}{q.kind !== 'blank' && q.item.pos ? <span style={{ font: mono, color: 'var(--text-3)', marginLeft: 8 }}>{q.item.pos}</span> : null}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {q.opts.map((o, i) => (
              <button key={o.key} onClick={() => answer(o)} style={optBtn(o)}>
                <span style={{ position: 'absolute', top: 6, left: 10, font: "600 10px 'JetBrains Mono', monospace", color: 'var(--text-3)', opacity: .8 }}>{i + 1}</span>
                {o.label}
              </button>
            ))}
          </div>
          {picked && (
            <div style={{ animation: 'hyFade .3s ease' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: picked.key === q.item.word ? 'var(--accent)' : '#e5484d', marginBottom: 6 }}>
                {picked.key === q.item.word ? '정답' : `오답 · 정답은 ${q.kind === 'ko' ? q.item.ko : q.item.word}`}
                {picked.key !== q.item.word && <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 13 }}> · 뒤에서 다시 나온다</span>}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
                <b style={{ color: 'var(--text)' }}>{q.item.word}</b> <span style={{ font: mono, color: 'var(--text-3)' }}>{q.item.pos}</span> — {q.item.ko}<br />
                <i>{q.item.ex}</i>
              </div>
              <button onClick={next} style={{ ...btn(true), padding: '8px 18px', fontSize: 14 }}>다음 → <span style={{ opacity: .7, fontSize: 11 }}>Enter</span></button>
            </div>
          )}
        </>
      )}
      <div style={{ font: mono, color: 'var(--text-3)', marginTop: 16, lineHeight: 1.7 }}>
        노트의 어휘 표 전부가 한 번씩 나온다. 틀리면 몇 문제 뒤에 다시 나오고, 전부 맞혀야 완료. 진행 상태는 이 기기에 남아 나중에 이어서 풀 수 있다.
      </div>
    </Card>
  )
}

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
  const [quiz, setQuiz] = useState(false)
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

  useEffect(() => { setQuiz(false) }, [cur])

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
  const markDone = () => { if (!done[cur]) setDoneStr(JSON.stringify({ ...done, [cur]: true })) }
  const isDay = !!doc && /^\d{4}-\d{2}-\d{2}$/.test(doc.id)

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
                {isDay && text && <button onClick={() => setQuiz((v) => !v)} style={btn(quiz)}>{quiz ? '노트 보기' : '어휘 퀴즈'}</button>}
                <button onClick={toggleDone} style={btn(!!done[cur])}>{done[cur] ? '읽음 ✓' : '읽음으로 표시'}</button>
              </span>
            </div>
          )}
          {quiz && isDay && text ? (
            <CryptoQuiz key={cur} date={cur} text={text} mobile={mobile} onDone={markDone} onClose={() => setQuiz(false)} />
          ) : (
            <Card style={{ padding: mobile ? '16px 16px' : '22px 26px' }}>
              {text ? <Markdown text={text} mobile={mobile} /> : <div style={{ font: mono, color: 'var(--text-3)' }}>여는 중…</div>}
            </Card>
          )}
          <div style={{ font: mono, color: 'var(--text-3)', marginTop: 10, fontSize: 11 }}>
            업데이트 버튼은 홈 탭 "AI 설정"의 Anthropic 키를 쓴다. 한 번에 기사 6~7편을 읽어 1~3분 걸리고, 비용은 회당 약 $0.3~0.5. 생성 노트(✦)는 이 기기와 동기화 계정에 저장되며, "md 복사"로 저장소에 옮기면 영구 보관된다.
          </div>
        </>
      )}
    </div>
  )
}
