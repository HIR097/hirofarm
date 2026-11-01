import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { Card, mono } from '../components/ui.jsx'
import * as sync from '../lib/sync.js'
import { getApiKey } from '../lib/foodAI.js'
import { MEALS, MEAL_HINT, DEFAULT_INGS, recommend } from '../lib/cookAI.js'
import { btn as pill, SubTabs } from './Holdem.jsx'

// 요리 — 가진 재료를 넣고 끼니(아침/점심/간식/저녁/야식) 버튼을 누르면 요리 3개를 추천한다.
//   재료: localStorage hy_cook_ings (문자열 배열). 한 개씩 Enter 또는 쉼표·줄바꿈으로 여러 개 붙여넣기.
//   추천: src/lib/cookAI.js — AI 키(홈 탭 AI 설정, hy_anthropic_key)가 있으면 Claude, 없으면 내장 레시피 DB.
//   결과: 끼니별 마지막 추천 hy_cook_last {meal:{dishes,source,ts}}.
//   레시피 북: 마음에 든 요리를 "저장" → hy_cook_book (계속 쌓임, 수정·삭제 가능).
//   동기화: 재료·레시피 북을 Supabase 'cook' 번들로 push/pull (stamp hy_cook_stamp).
//   "칼로리에 기록" → 홈/칼로리 탭과 같은 hy_cal_log 에 오늘 날짜·끼니로 추가 + 'calories' 번들 push.

const SYNC_KEY = 'cook'
const fade = { animation: 'hyFade .4s ease' }
const field = { background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
const btn = { background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 8px', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }
const pad2 = (n) => String(n).padStart(2, '0')
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
const newer = (a, b) => !b || Date.parse(a) > Date.parse(b)
const EMPTY = {}
const EMPTY_LIST = []

function useJsonStorage(key, fallback) {
  const [raw, setRaw] = useLocalStorage(key, JSON.stringify(fallback))
  const value = useMemo(() => { try { return JSON.parse(raw) ?? fallback } catch { return fallback } }, [raw, fallback])
  return [value, (next) => setRaw(JSON.stringify(next))]
}

// 지금 시각으로 끼니 추정 (홈 탭과 같은 기준)
function defaultMeal() {
  const h = new Date().getHours() + new Date().getMinutes() / 60
  if (h < 10) return '아침'
  if (h < 14) return '점심'
  if (h < 17) return '간식'
  if (h < 21) return '저녁'
  return '야식'
}
const splitIngs = (s) => s.split(/[,\n、·/]+/).map((x) => x.trim()).filter(Boolean)

const DIFF_COLOR = { 쉬움: '#22c55e', 보통: '#f59e0b', 어려움: '#ef4444' }

function DishCard({ d, mobile, onSave, saved, onLog, logged, onDelete, onEdit }) {
  const [open, setOpen] = useState(false)
  return (
    <Card style={{ padding: mobile ? 16 : 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{d.name}</div>
          {d.summary && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{d.summary}</div>}
        </div>
        <span style={{ font: mono, color: DIFF_COLOR[d.difficulty] || 'var(--text-3)', whiteSpace: 'nowrap' }}>{d.difficulty}</span>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Stat label="kcal" value={d.kcal} />
        <Stat label="단백질" value={`${d.protein}g`} />
        <Stat label="시간" value={`${d.minutes}분`} />
      </div>
      {d.uses?.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {d.uses.map((u, i) => <span key={i} style={chip(true)}>{u}</span>)}
          {d.missing?.map((u, i) => <span key={'m' + i} style={chip(false)} title="없는 재료">+ {u}</span>)}
        </div>
      )}
      <button onClick={() => setOpen(!open)} style={{ ...btn, alignSelf: 'flex-start' }}>{open ? '요리법 접기' : '요리법 보기'}</button>
      {open && (
        <div style={fade}>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)' }}>
            {d.steps?.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
          </ol>
          {d.tip && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)' }}>💡 {d.tip}</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        {onSave && <button onClick={onSave} disabled={saved} style={{ ...btn, opacity: saved ? 0.6 : 1 }}>{saved ? '레시피 북에 있음' : '레시피 북에 저장'}</button>}
        {onLog && <button onClick={onLog} disabled={logged} style={{ ...btn, opacity: logged ? 0.6 : 1 }}>{logged ? '기록됨 ✓' : '오늘 칼로리에 기록'}</button>}
        {onEdit && <button onClick={onEdit} style={btn}>수정</button>}
        {onDelete && <button onClick={onDelete} style={{ ...btn, color: '#ef4444' }}>삭제</button>}
      </div>
    </Card>
  )
}
const chip = (have) => ({ font: "500 11px 'Pretendard Variable'", padding: '2px 8px', borderRadius: 999, background: have ? 'rgba(34,197,94,.12)' : 'var(--surface2)', color: have ? '#16a34a' : 'var(--text-3)', border: have ? '1px solid rgba(34,197,94,.3)' : '1px dashed var(--line)' })
function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ font: mono, color: 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

// 레시피 직접 입력/수정 폼 — 음식은 계속 바뀌니 사용자가 손으로도 추가할 수 있게
function RecipeForm({ init, onSave, onCancel }) {
  const [f, setF] = useState(() => ({
    name: init?.name || '', meal: init?.meal || '저녁', summary: init?.summary || '', kcal: init?.kcal ?? '', protein: init?.protein ?? '', minutes: init?.minutes ?? '',
    difficulty: init?.difficulty || '쉬움', uses: (init?.uses || []).join(', '), steps: (init?.steps || []).join('\n'), tip: init?.tip || '',
  }))
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 8, ...fade }}>
      <div style={{ fontWeight: 700 }}>{init ? '레시피 수정' : '레시피 직접 추가'}</div>
      <input value={f.name} onChange={set('name')} placeholder="요리 이름" style={field} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MEALS.map((m) => <button key={m} onClick={() => setF({ ...f, meal: m })} style={pill(f.meal === m)}>{m}</button>)}
        {['쉬움', '보통', '어려움'].map((m) => <button key={m} onClick={() => setF({ ...f, difficulty: m })} style={{ ...pill(f.difficulty === m), marginLeft: m === '쉬움' ? 10 : 0 }}>{m}</button>)}
      </div>
      <input value={f.summary} onChange={set('summary')} placeholder="한 줄 소개" style={field} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={f.kcal} onChange={set('kcal')} placeholder="kcal" inputMode="numeric" style={field} />
        <input value={f.protein} onChange={set('protein')} placeholder="단백질 g" inputMode="decimal" style={field} />
        <input value={f.minutes} onChange={set('minutes')} placeholder="분" inputMode="numeric" style={field} />
      </div>
      <input value={f.uses} onChange={set('uses')} placeholder="재료 (쉼표로 구분: 계란 2개, 식빵 2장)" style={field} />
      <textarea value={f.steps} onChange={set('steps')} placeholder="조리 순서 — 한 줄에 한 단계" rows={5} style={{ ...field, resize: 'vertical' }} />
      <input value={f.tip} onChange={set('tip')} placeholder="팁 (선택)" style={field} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          disabled={!f.name.trim()}
          onClick={() => onSave({
            id: init?.id || `r${Date.now()}`, name: f.name.trim(), meal: f.meal, summary: f.summary.trim(), kcal: Number(f.kcal) || 0, protein: Number(f.protein) || 0, minutes: Number(f.minutes) || 0,
            difficulty: f.difficulty, uses: splitIngs(f.uses), missing: [], steps: f.steps.split('\n').map((s) => s.trim()).filter(Boolean), tip: f.tip.trim(), ts: new Date().toISOString(),
          })}
          style={{ ...btn, background: 'var(--accent)', color: 'var(--accent-text)', border: '1px solid var(--accent)' }}
        >저장</button>
        <button onClick={onCancel} style={btn}>취소</button>
      </div>
    </Card>
  )
}

export default function Cook() {
  const mobile = useIsMobile()
  const [sub, setSub] = useLocalStorage('hy_cook_tab', 'rec')
  const [ings, saveIngs] = useJsonStorage('hy_cook_ings', DEFAULT_INGS)
  const [last, saveLast] = useJsonStorage('hy_cook_last', EMPTY)
  const [book, saveBook] = useJsonStorage('hy_cook_book', EMPTY_LIST)
  const [stamp, setStamp] = useLocalStorage('hy_cook_stamp', '')
  const [draft, setDraft] = useState('')
  const [bulk, setBulk] = useState(false)
  const [note, setNote] = useState('')
  const [meal, setMeal] = useState(() => defaultMeal())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [edit, setEdit] = useState(null)   // null | 'new' | recipe
  const [bookMeal, setBookMeal] = useState('전체')
  const [logged, setLogged] = useState({})
  const touched = useRef(false)
  const inputRef = useRef(null)

  // ── 동기화: 마운트 때 pull, 변경 1.5초 뒤 push ──
  useEffect(() => {
    if (!sync.isConfigured() || !sync.isLoggedIn()) return
    let dead = false
    ;(async () => {
      try {
        const row = await sync.pull(SYNC_KEY)
        if (dead || !row || !newer(row.updated_at, stamp)) return
        const v = row.value || {}
        if (Array.isArray(v.ings)) saveIngs(v.ings)
        if (Array.isArray(v.book)) saveBook(v.book)
        setStamp(row.updated_at)
      } catch { /* 오프라인이면 로컬만 */ }
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!touched.current || !sync.isConfigured() || !sync.isLoggedIn()) return
    const t = setTimeout(async () => {
      try { const now = new Date().toISOString(); await sync.push(SYNC_KEY, { ings, book }, now); setStamp(now) } catch { /* 다음 변경 때 */ }
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ings, book])

  const setIngs = (n) => { touched.current = true; saveIngs(n) }
  const setBook = (n) => { touched.current = true; saveBook(n) }
  const addIngs = (text) => {
    const add = splitIngs(text).filter((x) => !ings.some((y) => y.toLowerCase() === x.toLowerCase()))
    if (add.length) setIngs([...ings, ...add])
    setDraft('')
  }
  const removeIng = (x) => setIngs(ings.filter((y) => y !== x))

  const run = async (m) => {
    setMeal(m)
    if (!ings.length) { setErr('재료를 먼저 넣어 주세요.'); return }
    setBusy(true); setErr('')
    const r = await recommend(ings, m, note.trim())
    saveLast({ ...last, [m]: { dishes: r.dishes, source: r.source, ts: new Date().toISOString() } })
    if (r.error) setErr(`AI 호출 실패(${r.error}) — 내장 레시피로 대신 추천했다`)
    setBusy(false)
  }
  const cur = last[meal]

  // 레시피 북
  const inBook = (d) => book.some((b) => b.name === d.name)
  const saveToBook = (d) => { if (!inBook(d)) setBook([{ ...d, id: `r${Date.now()}`, meal, ts: new Date().toISOString() }, ...book]) }
  const upsert = (r) => { setBook(book.some((b) => b.id === r.id) ? book.map((b) => (b.id === r.id ? r : b)) : [r, ...book]); setEdit(null) }
  const del = (id) => setBook(book.filter((b) => b.id !== id))
  const bookShown = book.filter((b) => bookMeal === '전체' || b.meal === bookMeal)

  // 오늘 칼로리 기록(hy_cal_log) 에 추가 — 홈/칼로리 탭과 같은 형식
  const logToday = (d, m) => {
    try {
      const log = JSON.parse(localStorage.getItem('hy_cal_log') || '{}') || {}
      const day = todayIso()
      const list = log[day] || []
      list.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: d.name, unit: '1인분', kcal: d.kcal, protein: d.protein || 0, qty: 1, meal: m })
      log[day] = list
      localStorage.setItem('hy_cal_log', JSON.stringify(log))
      setLogged({ ...logged, [d.name + m]: true })
      if (sync.isConfigured() && sync.isLoggedIn()) {
        const now = new Date().toISOString()
        sync.push('calories', {
          log, goal: localStorage.getItem('hy_cal_goal') || '3300', proteinGoal: localStorage.getItem('hy_cal_protein_goal') || '172',
          aiFoods: JSON.parse(localStorage.getItem('hy_cal_ai_foods') || '[]'),
        }, now).then(() => localStorage.setItem('hy_cal_stamp', now)).catch(() => {})
      }
    } catch { setErr('칼로리 기록에 실패했다') }
  }

  const grid = { display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SubTabs value={sub} onChange={setSub} items={[['rec', '추천'], ['book', `레시피 북 ${book.length ? `· ${book.length}` : ''}`]]} />

      {sub === 'rec' && (
        <>
          {/* 재료 */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>가진 재료 <span style={{ font: mono, color: 'var(--text-3)', marginLeft: 6 }}>{ings.length}</span></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setBulk(!bulk)} style={btn}>{bulk ? '한 개씩 입력' : '여러 개 붙여넣기'}</button>
                {ings.length > 0 && <button onClick={() => { if (confirm('재료를 모두 지울까요?')) setIngs([]) }} style={{ ...btn, color: 'var(--text-3)' }}>모두 지우기</button>}
                {ings.length === 0 && <button onClick={() => setIngs(DEFAULT_INGS)} style={btn}>기본 재료 불러오기</button>}
              </div>
            </div>
            {bulk ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder={'쉼표나 줄바꿈으로 구분해 붙여넣기\n예) 계란, 닭가슴살, 양파, 김치\n두부\n밥'} style={{ ...field, resize: 'vertical' }} />
                <button onClick={() => addIngs(draft)} disabled={!draft.trim()} style={{ ...btn, alignSelf: 'flex-start', background: 'var(--accent)', color: 'var(--accent-text)', border: '1px solid var(--accent)' }}>재료 추가</button>
              </div>
            ) : (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) addIngs(draft) }}
                placeholder="재료 입력 후 Enter (쉼표로 여러 개도 됨)"
                style={field}
              />
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: ings.length ? 12 : 0 }}>
              {ings.map((x) => (
                <span key={x} onClick={() => removeIng(x)} title="클릭하면 삭제" style={{ ...chip(true), cursor: 'pointer', fontSize: 12, padding: '4px 10px' }}>{x} ×</span>
              ))}
            </div>
          </Card>

          {/* 끼니 버튼 */}
          <Card>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {MEALS.map((m) => (
                <button key={m} onClick={() => run(m)} disabled={busy} style={{ ...pill(meal === m), fontSize: 14, padding: '8px 18px', opacity: busy ? 0.6 : 1 }}>{m}</button>
              ))}
              <span style={{ font: mono, color: 'var(--text-3)', marginLeft: 'auto' }}>
                {busy ? 'AI 가 고르는 중…' : getApiKey() ? 'AI 추천' : '내장 레시피 (홈 탭 AI 설정에 키를 넣으면 AI 추천)'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{meal} · {MEAL_HINT[meal]}</div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="요청 (선택) — 예: 매운 거, 15분 안에, 밥 없이, 고단백" style={{ ...field, marginTop: 10 }} />
            {err && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{err}</div>}
          </Card>

          {/* 결과 */}
          {cur && (
            <div style={fade}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, padding: '0 4px' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{meal} 추천 3가지</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ font: mono, color: 'var(--text-3)' }}>{cur.source === 'ai' ? 'AI' : '내장'} · {cur.ts.slice(5, 16).replace('T', ' ')}</span>
                  <button onClick={() => run(meal)} disabled={busy} style={btn}>다시 추천</button>
                </div>
              </div>
              <div style={grid}>
                {cur.dishes.map((d, i) => (
                  <DishCard key={i} d={d} mobile={mobile} onSave={() => saveToBook(d)} saved={inBook(d)} onLog={() => logToday(d, meal)} logged={!!logged[d.name + meal]} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {sub === 'book' && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {['전체', ...MEALS].map((m) => <button key={m} onClick={() => setBookMeal(m)} style={pill(bookMeal === m)}>{m}</button>)}
            <button onClick={() => setEdit('new')} style={{ ...btn, marginLeft: 'auto' }}>+ 직접 추가</button>
          </div>
          {edit && <RecipeForm init={edit === 'new' ? null : edit} onSave={upsert} onCancel={() => setEdit(null)} />}
          {bookShown.length === 0 && !edit && (
            <Card style={{ color: 'var(--text-3)', fontSize: 13 }}>아직 저장된 레시피가 없다. 추천 탭에서 "레시피 북에 저장"을 누르거나 직접 추가하면 여기 쌓인다.</Card>
          )}
          <div style={grid}>
            {bookShown.map((b) => (
              <DishCard key={b.id} d={b} mobile={mobile} onLog={() => logToday(b, b.meal || defaultMeal())} logged={!!logged[b.name + (b.meal || defaultMeal())]} onEdit={() => setEdit(b)} onDelete={() => { if (confirm(`"${b.name}" 삭제?`)) del(b.id) }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
