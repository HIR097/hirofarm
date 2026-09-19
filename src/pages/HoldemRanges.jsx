import { useEffect, useMemo, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { Card, mono } from '../components/ui.jsx'

// 홀덤 탭 · 오픈 레인지 — GTO Wizard 에서 추출한 프리플랍 17 스팟.
// 데이터: public/holdem/ranges.json (Downloads/hirofarm/holdem/ranges/*.json → export_ranges_json.py 로 생성, 공개 파일)
//   spots[].grid[hand] = { R: 레이즈%, C: 콜%, A: 올인% }  (폴드는 나머지)
//   spots[].cards      = 50% 규칙으로 순수전략화한 경계선 표기 (외우는 대상)
//   spots[].add        = RFI 에서 앞 포지션 대비 추가된 핸드
// 보기: '순수' = 50% 규칙으로 한 색만 / '혼합' = 빈도 비율대로 막대.

const RANKS = 'AKQJT98765432'
const COLOR = { R: '#e63946', C: '#2ea05a', A: '#6e1428' }
const FOLD = 'var(--surface2)'
const handAt = (r, c) => (r === c ? RANKS[r] + RANKS[r] : c > r ? RANKS[r] + RANKS[c] + 's' : RANKS[c] + RANKS[r] + 'o')

function Cell({ hand, fr, mode, size }) {
  const entries = Object.entries(fr || {}).filter(([, v]) => v >= 1)
  const total = Math.min(100, entries.reduce((s, [, v]) => s + v, 0))
  let bg = FOLD
  let title = hand + ' — 폴드'
  if (entries.length) {
    entries.sort((a, b) => b[1] - a[1])
    title = hand + ' — ' + entries.map(([k, v]) => `${k === 'R' ? '레이즈' : k === 'C' ? '콜' : '올인'} ${v}%`).join(' · ') + (total < 99 ? ` · 폴드 ${100 - total}%` : '')
    if (mode === 'pure') {
      const [k, v] = entries[0]
      bg = v >= 50 ? COLOR[k] : FOLD
    } else {
      // 왼쪽부터 액션 순서대로 막대, 나머지 폴드
      let acc = 0
      const stops = entries.map(([k, v]) => { const s = `${COLOR[k]} ${acc}% ${acc + v}%`; acc += v; return s })
      stops.push(`${FOLD} ${acc}% 100%`)
      bg = `linear-gradient(to right, ${stops.join(', ')})`
    }
  }
  const strong = mode === 'pure' ? bg !== FOLD : total >= 50
  return (
    <div title={title} style={{ background: bg, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3,
      font: `${hand.length === 2 ? 600 : 500} ${size < 30 ? 9 : 11}px 'Pretendard Variable'`, color: strong ? '#fff' : 'var(--text-3)', userSelect: 'none' }}>
      {hand}
    </div>
  )
}

export default function HoldemRanges({ mobile }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [cur, setCur] = useLocalStorage('hy_holdem_range_spot', 1)
  const [mode, setMode] = useLocalStorage('hy_holdem_range_mode', 'pure')
  useEffect(() => {
    fetch('/holdem/ranges.json?cb=' + Date.now()).then((r) => r.json()).then(setData).catch((e) => setErr('레인지 데이터를 못 불러왔다: ' + e.message))
  }, [])
  const spot = useMemo(() => data?.spots.find((s) => s.n === Number(cur)) || data?.spots[0], [data, cur])
  const size = mobile ? 24 : 40
  const chip = (active) => ({
    font: "500 12px 'Pretendard Variable'", color: active ? 'var(--accent-text)' : 'var(--text-2)', background: active ? 'var(--accent)' : 'var(--surface2)',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--line)'), borderRadius: 999, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
  })
  if (err) return <Card><div style={{ color: 'var(--text-2)', fontSize: 14 }}>{err}</div></Card>
  if (!data || !spot) return <div style={{ font: mono, color: 'var(--text-3)' }}>여는 중…</div>
  const groups = Object.entries(data.groups)
  return (
    <div>
      <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 10 }}>{data.setup}</div>
      {groups.map(([g, label]) => (
        <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ font: mono, color: 'var(--text-3)', width: mobile ? '100%' : 150, flexShrink: 0 }}>{label}</span>
          {data.spots.filter((s) => s.group === g).map((s) => (
            <button key={s.n} onClick={() => setCur(s.n)} style={chip(s.n === spot.n)}>{s.n}. {s.name}</button>
          ))}
        </div>
      ))}

      <Card style={{ padding: mobile ? 12 : 18, marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: mobile ? 16 : 18, fontWeight: 700, letterSpacing: '-.02em' }}>{spot.n}. {spot.name} <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 13 }}>히어로 {spot.hero}</span></div>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => setMode('pure')} style={chip(mode === 'pure')}>순수 (50% 규칙)</button>
            <button onClick={() => setMode('mix')} style={chip(mode === 'mix')}>혼합 (솔버 원값)</button>
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 10px' }}>{spot.desc}</div>
        <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 12 }}>
          {Object.entries(spot.freq).map(([k, v]) => `${spot.labels[k]} ${v}%`).join(' · ')} · 폴드 {Math.max(0, 100 - Object.values(spot.freq).reduce((a, b) => a + b, 0)).toFixed(1)}%
        </div>

        {/* 암기 카드 */}
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          {spot.cards.map((c) => (
            <div key={c.code} style={{ borderLeft: `3px solid ${COLOR[c.code]}`, padding: '4px 0 4px 12px' }}>
              <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 2 }}>{c.label} · {c.pct}% · 외울 것</div>
              <div style={{ fontSize: mobile ? 13.5 : 15, fontWeight: 600, lineHeight: 1.6, wordBreak: 'keep-all' }}>{c.text}</div>
            </div>
          ))}
          {spot.add && (
            <div style={{ borderLeft: '3px solid var(--line)', padding: '4px 0 4px 12px' }}>
              <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 2 }}>앞 포지션 대비 추가</div>
              <div style={{ fontSize: mobile ? 13 : 14, lineHeight: 1.6, color: 'var(--text-2)' }}>+ {spot.add.text}{spot.add.removed ? ` · 빠짐: ${spot.add.removed}` : ''}</div>
            </div>
          )}
          {!spot.cards.length && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>순수전략으로 남는 핸드가 없다 (전부 50% 미만 혼합).</div>}
        </div>

        {/* 13×13 격자 */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(13, ${size}px)`, gap: 2, width: 13 * size + 24 }}>
            {Array.from({ length: 169 }, (_, i) => {
              const r = Math.floor(i / 13), c = i % 13, h = handAt(r, c)
              return <Cell key={h} hand={h} fr={spot.grid[h]} mode={mode} size={size} />
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, font: mono, color: 'var(--text-3)' }}>
          {Object.entries(spot.labels).map(([k, l]) => <span key={k}><span style={{ display: 'inline-block', width: 10, height: 10, background: COLOR[k], borderRadius: 2, marginRight: 5, verticalAlign: -1 }} />{l}</span>)}
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: FOLD, border: '1px solid var(--line)', borderRadius: 2, marginRight: 5, verticalAlign: -1 }} />폴드</span>
          <span>· 칸에 마우스를 올리면 빈도. 대각선 위 수딧, 아래 오프수트</span>
        </div>
      </Card>

      <div style={{ font: mono, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.7 }}>
        외우는 법: 혼합은 50% 이상이면 한다로 뭉갠다 (어느 쪽이든 EV 차이 거의 0). 핸드 목록이 아니라 경계선(K5s+)을 외운다. 오픈은 UTG 한 줄 + 포지션별 추가분만. 표는 확인용이고 몸에 붙이는 건 Trainer 드릴.
        {' '}15·17번은 이 솔루션 트리에 콜 노드가 없어 4벳/폴드만 나온다.
      </div>
    </div>
  )
}
