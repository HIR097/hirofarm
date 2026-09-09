import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import * as sync from '../lib/sync.js'
import { mono } from '../components/ui.jsx'

// 홀덤 > 태깅 입력 — "Inside the Mind of a Pro" 결정 태깅 시트의 입력 화면.
// 마크다운 시트(mateos-tagging.md)의 빈 표를 실제로 채우는 곳. 1차 33개는 시트에 있고 여기는 내가 채우는 67개.
// 저장 hy_holdem_tags (배열) + hy_holdem_tags_stamp, sync 키 'holdem_tags'.
// 한 행 = { id, ep, t, spot, order: [라벨...], concl }

const SYNC_KEY = 'holdem_tags'
const SEEDED = 33      // 시트에 이미 채워 둔 1차 태그
const TARGET = 100     // 로드맵 목표

const EPS = ['EP03', 'EP04', 'EP05', 'EP06', 'EP07', 'EP08', 'EP09', 'EP10', 'EP11', 'EP12', 'EP13', 'EP14', 'EP25', 'EP26', 'EP27']
const DONE_EPS = ['EP03', 'EP04', 'EP05']  // 1차 태그로 이미 훑은 편
const LABELS = ['상대유형', '속도·텔', '스택·SPR', 'ICM·페이', '포지션', '내레인지', '상대레인지', '블락커', '사이즈이유', '다음거리', '메타·이미지']

const pad = (n) => String(n).padStart(2, '0')
const newer = (a, b) => !b || Date.parse(a) > Date.parse(b)
const clock = (iso) => {
  try {
    const d = new Date(iso)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}
// "12:37" / "1:03:29" → 정렬용 초
const secs = (t) => String(t || '').split(':').reduce((a, p) => a * 60 + (parseInt(p, 10) || 0), 0)

const input = {
  font: "500 13px 'Pretendard Variable'",
  color: 'var(--text)',
  background: 'var(--surface2)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '7px 10px',
  outline: 'none',
  minWidth: 0,
}
const chip = (on) => ({
  font: "500 12px 'Pretendard Variable'",
  color: on ? 'var(--accent-text)' : 'var(--text-2)',
  background: on ? 'var(--accent)' : 'var(--surface2)',
  border: '1px solid ' + (on ? 'var(--accent)' : 'var(--line)'),
  borderRadius: 999,
  padding: '5px 11px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})
const btn = (primary) => ({
  font: "600 13px 'Pretendard Variable'",
  color: primary ? 'var(--accent-text)' : 'var(--text-2)',
  background: primary ? 'var(--accent)' : 'var(--surface2)',
  border: '1px solid ' + (primary ? 'var(--accent)' : 'var(--line)'),
  borderRadius: 9,
  padding: '8px 16px',
  cursor: 'pointer',
})

export default function Tagging({ mobile }) {
  const [raw, setRaw] = useLocalStorage('hy_holdem_tags', '[]')
  const [stamp, setStamp] = useLocalStorage('hy_holdem_tags_stamp', '')
  const [syncMsg, setSyncMsg] = useState('')
  const rows = useMemo(() => {
    try {
      return JSON.parse(raw) || []
    } catch {
      return []
    }
  }, [raw])
  const save = (next) => setRaw(JSON.stringify(next))

  // ── 입력 폼 ──
  const [ep, setEp] = useState('EP06')
  const [t, setT] = useState('')
  const [spot, setSpot] = useState('')
  const [order, setOrder] = useState([])
  const [concl, setConcl] = useState('')

  const reset = () => { setT(''); setSpot(''); setOrder([]); setConcl('') }
  const toggle = (l) => setOrder((o) => (o.includes(l) ? o.filter((x) => x !== l) : [...o, l]))
  const canAdd = t.trim() && order.length > 0

  const add = () => {
    if (!canAdd) return
    save([...rows, { id: Date.now(), ep, t: t.trim(), spot: spot.trim(), order, concl: concl.trim() }])
    reset()
  }
  const remove = (id) => save(rows.filter((r) => r.id !== id))
  const edit = (r) => {
    setEp(r.ep); setT(r.t); setSpot(r.spot); setOrder(r.order || []); setConcl(r.concl)
    save(rows.filter((x) => x.id !== r.id))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── 동기화 (다른 탭과 같은 방식: 열 때 pull, 1.5초 뒤 push) ──
  const skipPush = useRef(true)
  const stampRef = useRef(stamp)
  stampRef.current = stamp
  useEffect(() => {
    const pull = async () => {
      if (!sync.isConfigured() || !sync.isLoggedIn()) return
      try {
        const remote = await sync.pull(SYNC_KEY)
        if (remote && newer(remote.updatedAt, stampRef.current)) {
          skipPush.current = true
          if (Array.isArray(remote.value?.rows)) setRaw(JSON.stringify(remote.value.rows))
          setStamp(remote.updatedAt)
          setSyncMsg(`${clock(remote.updatedAt)} 불러옴`)
        }
      } catch (e) {
        setSyncMsg(e.message || '불러오기 실패')
      }
    }
    pull()
    const onVis = () => { if (document.visibilityState === 'visible') pull() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (skipPush.current) {
      skipPush.current = false
      return
    }
    if (!sync.isConfigured() || !sync.isLoggedIn()) return
    const timer = setTimeout(async () => {
      try {
        const now = new Date().toISOString()
        await sync.push(SYNC_KEY, { rows }, now)
        setStamp(now)
        setSyncMsg(`${clock(now)} 저장됨`)
      } catch (e) {
        setSyncMsg(e.message || '저장 실패')
      }
    }, 1500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  // ── 통계 (가설 1 검증용: 그가 무엇을 먼저 보는가) ──
  const sorted = useMemo(
    () => [...rows].sort((a, b) => EPS.indexOf(a.ep) - EPS.indexOf(b.ep) || secs(a.t) - secs(b.t)),
    [rows],
  )
  const firstCount = useMemo(() => {
    const m = {}
    for (const r of rows) {
      const f = (r.order || [])[0]
      if (f) m[f] = (m[f] || 0) + 1
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [rows])
  const perEp = useMemo(() => {
    const m = {}
    for (const r of rows) m[r.ep] = (m[r.ep] || 0) + 1
    return m
  }, [rows])
  const total = SEEDED + rows.length
  const pct = Math.min(100, Math.round((total / TARGET) * 100))

  const copyMd = () => {
    const head = '| # | EP@시각 | 스팟 | 그가 본 순서 | 결론 |\n|---|---|---|---|---|\n'
    const body = sorted
      .map((r, i) => `| ${SEEDED + i + 1} | ${r.ep.slice(2)}@${r.t} | ${r.spot} | ${(r.order || []).join(' → ')} | ${r.concl} |`)
      .join('\n')
    navigator.clipboard?.writeText(head + body).then(
      () => setSyncMsg('마크다운 복사됨'),
      () => setSyncMsg('복사 실패 — 브라우저가 막음'),
    )
  }

  const box = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: mobile ? 14 : 18, marginBottom: 14 }

  return (
    <div>
      {/* 진행 */}
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            태깅 {total} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>/ {TARGET}</span>
          </div>
          <div style={{ font: mono, color: 'var(--text-3)' }}>
            시트 {SEEDED} + 내가 쓴 것 {rows.length}{syncMsg && ` · ${syncMsg}`}
          </div>
        </div>
        <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 999, overflow: 'hidden', margin: '10px 0 8px' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {EPS.map((e) => {
            const n = perEp[e] || 0
            const seeded = DONE_EPS.includes(e)
            return (
              <span
                key={e}
                title={seeded ? '1차 태그 완료(시트)' : `${n}개`}
                style={{
                  font: mono,
                  color: seeded || n ? 'var(--accent-text)' : 'var(--text-3)',
                  background: seeded ? 'var(--accent)' : n ? 'var(--accent)' : 'var(--surface2)',
                  opacity: seeded ? 0.55 : 1,
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '3px 7px',
                }}
              >
                {e.slice(2)}{n ? ` ${n}` : ''}
              </span>
            )
          })}
        </div>
      </div>

      {/* 입력 */}
      <div style={box}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>새 태그</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 12 }}>
          그가 이유를 두 문장 이상 말한 결정만 잡는다. 라벨은 <b style={{ color: 'var(--text-2)' }}>그가 말한 순서대로</b> 누른다 — 옳은 순서가 아니라 실제로 뱉은 순서.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 9 }}>
          <select value={ep} onChange={(e) => setEp(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
            {EPS.map((e) => <option key={e} value={e}>{e}{DONE_EPS.includes(e) ? ' (1차 완료)' : ''}</option>)}
          </select>
          <input value={t} onChange={(e) => setT(e.target.value)} placeholder="시각 12:37" style={{ ...input, width: 110 }} />
          <input value={spot} onChange={(e) => setSpot(e.target.value)} placeholder="스팟 — 예: AJs vs SB 스퀴즈" style={{ ...input, flex: '1 1 220px' }} />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}>
          {LABELS.map((l) => {
            const i = order.indexOf(l)
            return (
              <button key={l} onClick={() => toggle(l)} style={chip(i >= 0)}>
                {i >= 0 ? `${i + 1}. ` : ''}{l}
              </button>
            )
          })}
        </div>
        {order.length > 0 && (
          <div style={{ font: mono, color: 'var(--text-2)', marginBottom: 9 }}>{order.join('  →  ')}</div>
        )}

        <input
          value={concl}
          onChange={(e) => setConcl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          placeholder="결론 — 그의 근거를 한 문장으로"
          style={{ ...input, width: '100%', marginBottom: 11 }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={add} disabled={!canAdd} style={{ ...btn(true), opacity: canAdd ? 1 : 0.4, cursor: canAdd ? 'pointer' : 'default' }}>추가</button>
          <button onClick={reset} style={btn(false)}>지우기</button>
          {rows.length > 0 && <button onClick={copyMd} style={{ ...btn(false), marginLeft: 'auto' }}>마크다운 복사</button>}
        </div>
      </div>

      {/* 통계 */}
      {rows.length >= 3 && (
        <div style={box}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>그가 먼저 보는 것</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 12 }}>
            내가 쓴 {rows.length}개의 첫 라벨 분포. 시트의 1차 33개에서는 <b style={{ color: 'var(--text-2)' }}>상대유형·속도·텔이 14개로 1위</b>였다.
          </div>
          {firstCount.map(([l, n]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 78, fontSize: 12.5, color: 'var(--text-2)', textAlign: 'right', flexShrink: 0 }}>{l}</div>
              <div style={{ flex: 1, height: 8, background: 'var(--surface2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${(n / firstCount[0][1]) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
              </div>
              <div style={{ font: mono, color: 'var(--text-3)', width: 22 }}>{n}</div>
            </div>
          ))}
        </div>
      )}

      {/* 목록 */}
      <div style={box}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>내가 쓴 태그 {rows.length}</div>
        {rows.length === 0 && (
          <div style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.7 }}>
            아직 없다. EP06부터 시작하면 된다. 한 편에 5~8개면 충분하고, 모든 핸드를 볼 필요는 없다.
          </div>
        )}
        {sorted.map((r, i) => (
          <div key={r.id} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ font: mono, color: 'var(--text-3)', flexShrink: 0 }}>{SEEDED + i + 1}</span>
              <span style={{ font: mono, color: 'var(--accent)', flexShrink: 0 }}>{r.ep.slice(2)}@{r.t}</span>
              <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{r.spot}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => edit(r)} style={{ ...chip(false), padding: '3px 9px' }}>수정</button>
                <button onClick={() => remove(r.id)} style={{ ...chip(false), padding: '3px 9px' }}>×</button>
              </span>
            </div>
            <div style={{ font: mono, color: 'var(--text-2)', margin: '5px 0 3px' }}>{(r.order || []).join('  →  ')}</div>
            {r.concl && <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{r.concl}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
