import { useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { Card, mono } from '../components/ui.jsx'
import Tagging from './HoldemTagging.jsx'
import Ranges from './HoldemRanges.jsx'

// 홀덤 — 포커 책을 장별로 정리한 노트 (영어 탭 보고서 형식).
// 데이터는 public/holdem/ (공개 번들, 암호화 대상 아님). Claude 가 원서를 읽고 쓴 정리본.
//   index.json      가이드(guides)·책 장(chapters) 목록
//   <chapterId>.md  장별 정리 (마크다운 일부 문법: #, ##, ###, -, 1., 중첩 목록, > 인용, |표|, **굵게**)
// 읽은 장 체크는 localStorage hy_holdem_done.

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
// md 대신 컴포넌트를 띄우는 탭 (index.json guides 의 tool 값)
const TOOLS = new Set(['tagging', 'ranges'])
export const btn = (active) => ({
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
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <b key={i} style={{ color: 'var(--text)' }}>{p.slice(2, -2)}</b>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} style={{ background: 'var(--surface2)', borderRadius: 4, padding: '0 4px', fontSize: '0.92em' }}>{p.slice(1, -1)}</code>
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(p)  // http(s) 만 (javascript: 차단)
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', borderBottom: '1px solid var(--accent)', paddingBottom: 1 }}>{link[1]}</a>
    return p
  })
}

// 들여쓰기로 중첩된 목록 (items: {indent, ordered, text})
function List({ items, P, pad, nested }) {
  const base = items[0].indent
  const nodes = []
  let k = 0
  while (k < items.length) {
    const node = { text: items[k].text, kids: [] }
    k++
    while (k < items.length && items[k].indent > base) { node.kids.push(items[k]); k++ }
    nodes.push(node)
  }
  const Tag = items[0].ordered ? 'ol' : 'ul'
  return (
    <Tag style={{ margin: nested ? '5px 0 2px' : '0 0 12px', paddingLeft: pad }}>
      {nodes.map((n, j) => (
        <li key={j} style={{ ...P, margin: '0 0 5px' }}>
          {inline(n.text)}
          {n.kids.length > 0 && <List items={n.kids} P={P} pad={pad} nested />}
        </li>
      ))}
    </Tag>
  )
}

export function Markdown({ text, mobile }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const out = []
  let i = 0
  const P = { fontSize: 15, lineHeight: mobile ? 1.7 : 1.75, color: 'var(--text-2)', margin: '0 0 10px', overflowWrap: 'anywhere' }
  while (i < lines.length) {
    const ln = lines[i]
    if (!ln.trim()) { i++; continue }
    if (ln.startsWith('# ')) { out.push(<h1 key={i} style={{ fontSize: mobile ? 20 : 22, fontWeight: 700, letterSpacing: '-.02em', margin: '4px 0 6px', lineHeight: 1.35 }}>{inline(ln.slice(2))}</h1>); i++; continue }
    if (ln.startsWith('## ')) { out.push(<h2 key={i} style={{ fontSize: mobile ? 17 : 18, fontWeight: 700, margin: '26px 0 8px', paddingTop: 14, borderTop: '1px solid var(--line)' }}>{inline(ln.slice(3))}</h2>); i++; continue }
    if (ln.startsWith('### ')) { out.push(<h3 key={i} style={{ fontSize: mobile ? 15.5 : 15, fontWeight: 700, margin: mobile ? '20px 0 8px' : '16px 0 6px', color: 'var(--text)' }}>{inline(ln.slice(4))}</h3>); i++; continue }
    if (ln.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++ }
      const cells = rows.filter((r) => !/^\|\s*-+/.test(r)).map((r) => r.split('|').slice(1, -1).map((c) => c.trim()))
      const [head, ...body] = cells
      // 폰에서는 3열 이상 표가 가로로 넘쳐 읽기 어렵다 → 행마다 카드로 쌓는다.
      // 첫 칸 = 제목, 짧은 둘째 칸(품사 등) = 제목 옆 꼬리표, 나머지 = "머리글 + 값" 줄.
      if (mobile && head.length >= 3) {
        const short = body.every((r) => (r[1] || '').length <= 8)
        out.push(
          <div key={i} style={{ margin: '6px 0 14px', borderTop: '1px solid var(--line)' }}>
            {body.map((r, k) => (
              <div key={k} style={{ padding: '10px 0 9px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                  {r[0] ? inline(r[0]) : <span style={{ color: 'var(--text-3)' }}>{head[0] || '—'}</span>}
                  {short && r[1] && <span style={{ marginLeft: 7, fontSize: 12, fontWeight: 500, color: 'var(--text-3)' }}>{r[1]}</span>}
                </div>
                {r.slice(short ? 2 : 1).map((c, j) => {
                  const label = head[j + (short ? 2 : 1)]
                  if (!c) return null
                  return (
                    <div key={j} style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>
                      {label && <span style={{ flex: '0 0 auto', minWidth: 44, maxWidth: 84, fontSize: 12, lineHeight: '21.7px', color: 'var(--text-3)' }}>{label}</span>}
                      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{inline(c)}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>,
        )
        continue
      }
      out.push(
        <div key={i} style={{ overflowX: 'auto', margin: '6px 0 12px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: mobile ? 14 : 13.5 }}>
            <thead><tr>{head.map((c, j) => <th key={j} style={{ textAlign: 'left', padding: mobile ? '7px 8px 7px 0' : '7px 10px', borderBottom: '1px solid var(--line)', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j} style={{ padding: mobile ? '8px 8px 8px 0' : '7px 10px', borderBottom: '1px solid var(--line)', verticalAlign: 'top', lineHeight: 1.5, overflowWrap: 'anywhere', ...(mobile && j === 0 ? { width: '34%', color: 'var(--text)' } : null) }}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (ln.startsWith('> ')) {
      const quote = []
      while (i < lines.length && lines[i].startsWith('> ')) { quote.push(lines[i].slice(2)); i++ }
      out.push(
        <blockquote key={i} style={{ margin: '0 0 12px', padding: '2px 0 2px 14px', borderLeft: '3px solid var(--accent)' }}>
          {quote.map((q, k) => <p key={k} style={{ ...P, margin: k === quote.length - 1 ? 0 : '0 0 6px' }}>{inline(q)}</p>)}
        </blockquote>,
      )
      continue
    }
    if (/^\s*[-•] /.test(ln) || /^\s*\d+\. /.test(ln)) {
      const items = []
      while (i < lines.length && (/^\s*[-•] /.test(lines[i]) || /^\s*\d+\. /.test(lines[i]))) {
        items.push({
          indent: lines[i].match(/^\s*/)[0].length,
          ordered: /^\s*\d+\. /.test(lines[i]),
          text: lines[i].replace(/^\s*([-•]|\d+\.) /, ''),
        })
        i++
      }
      out.push(<List key={i} items={items} P={P} pad={mobile ? 19 : 22} />)
      continue
    }
    out.push(<p key={i} style={P}>{inline(ln)}</p>)
    i++
  }
  return <div>{out}</div>
}

export function SubTabs({ value, onChange, items }) {
  return (
    <div className="hy-noscroll" style={{ display: 'flex', gap: 22, borderBottom: '1px solid var(--line)', margin: '0 0 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
      const first = (ix.guides || [])[0] || (ix.chapters || [])[0]
      // 저장된 탭이 목록에서 빠졌으면(문서 분리·삭제) 첫 탭으로
      const known = [...(ix.guides || []), ...(ix.chapters || [])].some((c) => c.id === cur)
      if ((!cur || !known) && first) setCur(first.id)
    }).catch((e) => setErr('목록을 못 불러왔다: ' + e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!cur || TOOLS.has(cur)) return
    let alive = true
    setText('')
    fetch(`/holdem/${cur}.md?cb=` + Date.now()).then((r) => r.text()).then((t) => alive && setText(t)).catch(() => alive && setText('# 불러오기 실패'))
    return () => { alive = false }
  }, [cur])

  const docs = [...(index?.guides || []), ...(index?.chapters || [])]
  const ch = docs.find((c) => c.id === cur)
  const toggleDone = () => setDoneStr(JSON.stringify({ ...done, [cur]: !done[cur] }))

  return (
    <div style={fade}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, margin: '4px 0 16px' }}>
        <div style={{ font: mono, color: 'var(--text-3)' }}>{index ? `${index.book} · ${index.author} · ${index.chapters.length}장 정리${index.guides?.length ? ' + 가이드 ' + index.guides.length : ''}` : ''}</div>
        <div style={{ font: mono, color: 'var(--text-3)' }}>읽은 장 {Object.values(done).filter(Boolean).length}</div>
      </div>
      {err && <Card><div style={{ color: 'var(--text-2)', fontSize: 14 }}>{err}</div></Card>}
      {index && (
        <>
          <SubTabs value={cur} onChange={setCur} items={docs.map((c) => [c.id, `${c.tab || c.n + '장'}${done[c.id] ? ' ✓' : ''}`])} />
          {ch && !TOOLS.has(cur) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ font: mono, color: 'var(--text-3)' }}>{ch.words ? `원문 약 ${ch.words.toLocaleString()}단어` : ''}{ch.date ? ` · ${ch.date}` : ''}</span>
              <button onClick={toggleDone} style={{ ...btn(!!done[cur]), marginLeft: 'auto' }}>{done[cur] ? '읽음 ✓' : '읽음으로 표시'}</button>
            </div>
          )}
          {TOOLS.has(cur) ? (
            cur === 'ranges' ? <Ranges mobile={mobile} /> : <Tagging mobile={mobile} />
          ) : (
            <Card style={{ padding: mobile ? '16px 15px' : '22px 26px' }}>
              {text ? <Markdown text={text} mobile={mobile} /> : <div style={{ font: mono, color: 'var(--text-3)' }}>여는 중…</div>}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
