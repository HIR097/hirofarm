import { useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { Card, mono } from '../components/ui.jsx'

// 홀덤 — 포커 책을 장별로 정리한 노트 (영어 탭 보고서 형식).
// 데이터는 public/holdem/ (공개 번들, 암호화 대상 아님). Claude 가 원서를 읽고 쓴 정리본.
//   index.json      책·장 목록
//   <chapterId>.md  장별 정리 (마크다운 일부 문법: #, ##, ###, -, 1., |표|, **굵게**)
// 읽은 장 체크는 localStorage hy_holdem_done.

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const btn = (active) => ({
  font: "500 12px 'Pretendard Variable'",
  color: active ? 'var(--accent-text)' : 'var(--text-2)',
  background: active ? 'var(--accent)' : 'var(--surface2)',
  border: '1px solid ' + (active ? 'var(--accent)' : 'var(--line)'),
  borderRadius: 999,
  padding: '5px 12px',
  cursor: 'pointer',
})

// ── 아주 작은 마크다운 렌더러 (정리본에 쓰는 문법만) ──
function inline(s) {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <b key={i} style={{ color: 'var(--text)' }}>{p.slice(2, -2)}</b>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} style={{ background: 'var(--surface2)', borderRadius: 4, padding: '0 4px', fontSize: '0.92em' }}>{p.slice(1, -1)}</code>
    return p
  })
}

function Markdown({ text, mobile }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const out = []
  let i = 0
  const P = { fontSize: mobile ? 14 : 15, lineHeight: 1.75, color: 'var(--text-2)', margin: '0 0 10px' }
  while (i < lines.length) {
    const ln = lines[i]
    if (!ln.trim()) { i++; continue }
    if (ln.startsWith('# ')) { out.push(<h1 key={i} style={{ fontSize: mobile ? 19 : 22, fontWeight: 700, letterSpacing: '-.02em', margin: '4px 0 6px', lineHeight: 1.35 }}>{inline(ln.slice(2))}</h1>); i++; continue }
    if (ln.startsWith('## ')) { out.push(<h2 key={i} style={{ fontSize: mobile ? 16 : 18, fontWeight: 700, margin: '26px 0 8px', paddingTop: 14, borderTop: '1px solid var(--line)' }}>{inline(ln.slice(3))}</h2>); i++; continue }
    if (ln.startsWith('### ')) { out.push(<h3 key={i} style={{ fontSize: mobile ? 14 : 15, fontWeight: 700, margin: '16px 0 6px' }}>{inline(ln.slice(4))}</h3>); i++; continue }
    if (ln.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++ }
      const cells = rows.filter((r) => !/^\|\s*-+/.test(r)).map((r) => r.split('|').slice(1, -1).map((c) => c.trim()))
      const [head, ...body] = cells
      out.push(
        <div key={i} style={{ overflowX: 'auto', margin: '6px 0 12px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: mobile ? 12.5 : 13.5 }}>
            <thead><tr>{head.map((c, j) => <th key={j} style={{ textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid var(--line)', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j} style={{ padding: '7px 10px', borderBottom: '1px solid var(--line)', verticalAlign: 'top', lineHeight: 1.5 }}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^\s*[-•] /.test(ln) || /^\s*\d+\. /.test(ln)) {
      const items = []
      const ordered = /^\s*\d+\. /.test(ln)
      while (i < lines.length && (/^\s*[-•] /.test(lines[i]) || /^\s*\d+\. /.test(lines[i]))) {
        const indent = lines[i].match(/^\s*/)[0].length
        items.push([indent, lines[i].replace(/^\s*([-•]|\d+\.) /, '')])
        i++
      }
      const Tag = ordered ? 'ol' : 'ul'
      out.push(
        <Tag key={i} style={{ margin: '0 0 12px', paddingLeft: 22 }}>
          {items.map(([ind, t], k) => <li key={k} style={{ ...P, margin: '0 0 5px', marginLeft: ind >= 2 ? 16 : 0 }}>{inline(t)}</li>)}
        </Tag>,
      )
      continue
    }
    out.push(<p key={i} style={P}>{inline(ln)}</p>)
    i++
  }
  return <div>{out}</div>
}

function SubTabs({ value, onChange, items }) {
  return (
    <div style={{ display: 'flex', gap: 22, borderBottom: '1px solid var(--line)', margin: '0 0 16px', overflowX: 'auto' }}>
      {items.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 2px 10px', whiteSpace: 'nowrap',
            font: `${value === k ? 600 : 500} 14px 'Pretendard Variable'`, color: value === k ? 'var(--text)' : 'var(--text-3)',
            borderBottom: value === k ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default function Holdem() {
  const mobile = useIsMobile()
  const [index, setIndex] = useState(null)
  const [err, setErr] = useState('')
  const [cur, setCur] = useLocalStorage('hy_holdem_ch', '')
  const [doneStr, setDoneStr] = useLocalStorage('hy_holdem_done', '{}')
  const [text, setText] = useState('')
  const done = (() => { try { return JSON.parse(doneStr) || {} } catch { return {} } })()

  useEffect(() => {
    fetch('/holdem/index.json?cb=' + Date.now()).then((r) => r.json()).then((ix) => {
      setIndex(ix)
      if (!cur && ix.chapters?.length) setCur(ix.chapters[0].id)
    }).catch((e) => setErr('목록을 못 불러왔다: ' + e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!cur) return
    let alive = true
    setText('')
    fetch(`/holdem/${cur}.md?cb=` + Date.now()).then((r) => r.text()).then((t) => alive && setText(t)).catch(() => alive && setText('# 불러오기 실패'))
    return () => { alive = false }
  }, [cur])

  const ch = index?.chapters?.find((c) => c.id === cur)
  const toggleDone = () => setDoneStr(JSON.stringify({ ...done, [cur]: !done[cur] }))

  return (
    <div style={fade}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, margin: '4px 0 16px' }}>
        <div style={{ font: mono, color: 'var(--text-3)' }}>{index ? `${index.book} · ${index.author} · ${index.chapters.length}장 정리` : ''}</div>
        <div style={{ font: mono, color: 'var(--text-3)' }}>읽은 장 {Object.values(done).filter(Boolean).length}</div>
      </div>
      {err && <Card><div style={{ color: 'var(--text-2)', fontSize: 14 }}>{err}</div></Card>}
      {index && (
        <>
          <SubTabs value={cur} onChange={setCur} items={index.chapters.map((c) => [c.id, `${c.n}장${done[c.id] ? ' ✓' : ''}`])} />
          {ch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ font: mono, color: 'var(--text-3)' }}>{ch.words ? `원문 약 ${ch.words.toLocaleString()}단어` : ''}{ch.date ? ` · ${ch.date}` : ''}</span>
              <button onClick={toggleDone} style={{ ...btn(!!done[cur]), marginLeft: 'auto' }}>{done[cur] ? '읽음 ✓' : '읽음으로 표시'}</button>
            </div>
          )}
          <Card style={{ padding: mobile ? '16px 16px' : '22px 26px' }}>
            {text ? <Markdown text={text} mobile={mobile} /> : <div style={{ font: mono, color: 'var(--text-3)' }}>여는 중…</div>}
          </Card>
        </>
      )}
    </div>
  )
}
