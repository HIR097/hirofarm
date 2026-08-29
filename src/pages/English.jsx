import { useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { Card, mono, BLUE, BLUE_BG } from '../components/ui.jsx'

// 영어 — 포커 브이로그(Brad Owen)에서 뽑은 학습 보고서.
// 데이터는 public/english/ (공개 번들, 암호화 대상 아님). /eng-report 스킬이 만든다.
//   index.json            영상 목록 + 누적 표현
//   reports/<videoId>.json 영상별 표현·문법·쉐도잉·리텔
// 진도(5단계 체크)는 localStorage hy_eng_progress 에만 둔다.

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const SERIF = "Georgia, 'Times New Roman', 'Apple SD Gothic Neo', serif"
const yt = (url, sec) => `${url}&t=${sec}s`

const STEPS = [
  ['pre', '프리리드', '표현·문법·쉐도잉 구간을 한 번 읽기. 외우려 하지 말 것', '10분'],
  ['watch', '통째 시청', '자막 없이 1회. 못 알아들은 구간만 시각 메모', '영상 길이'],
  ['shadow', '쉐도잉', '구간 3개 × 5회. 처음 2회는 듣기만, 3회부터 따라 말하기', '15분'],
  ['retell', '리텔', '핸드 하나를 영어로 직접 해설 → 교정받기. 제일 중요한 단계', '15분'],
  ['save', '저장', '교정에서 나온 표현 기록', '5분'],
]

const btn = (active) => ({
  font: "500 12px 'Pretendard Variable'",
  color: active ? 'var(--accent-text)' : 'var(--text-2)',
  background: active ? 'var(--accent)' : 'var(--surface2)',
  border: '1px solid ' + (active ? 'var(--accent)' : 'var(--line)'),
  borderRadius: 999,
  padding: '5px 12px',
  cursor: 'pointer',
})

function Stamp({ url, sec, label }) {
  return (
    <a
      href={yt(url, sec)}
      target="_blank"
      rel="noopener"
      title="유튜브에서 이 지점부터 재생"
      style={{ font: "700 11px 'JetBrains Mono'", padding: '2px 9px', borderRadius: 8, background: BLUE_BG, color: BLUE, textDecoration: 'none', whiteSpace: 'nowrap' }}
    >
      {label}
    </a>
  )
}

function Quote({ children, size = 15 }) {
  return (
    <p style={{ margin: '10px 0 0', padding: '10px 14px', borderLeft: '3px solid var(--accent)', background: 'var(--surface2)', borderRadius: '0 8px 8px 0', fontFamily: SERIF, fontSize: size, lineHeight: 1.55 }}>
      {children}
    </p>
  )
}

function SectionTitle({ title, caption }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '30px 0 12px' }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      {caption && <span style={{ font: mono, color: 'var(--text-3)' }}>{caption}</span>}
    </div>
  )
}

// ── 영상 목록 ──
function VideoList({ index, progress, onOpen }) {
  if (!index.videos.length)
    return (
      <Card>
        <div style={{ color: 'var(--text-2)', fontSize: 14 }}>아직 보고서가 없다. 터미널에서 <code>/eng-report &lt;유튜브 URL&gt;</code></div>
      </Card>
    )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {index.videos.map((v) => {
        const p = progress[v.id] || {}
        const done = STEPS.filter(([k]) => p[k]).length
        return (
          <Card key={v.id} style={{ padding: 18, cursor: 'pointer' }}>
            <div onClick={() => onOpen(v.id)}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ font: mono, color: 'var(--text-3)' }}>{v.watched}</span>
                <span style={{ font: mono, color: 'var(--text-3)' }}>{v.channel} · {v.duration}</span>
                <span style={{ marginLeft: 'auto', font: mono, color: done === STEPS.length ? 'var(--accent)' : 'var(--text-3)' }}>
                  {done}/{STEPS.length}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6, lineHeight: 1.4 }}>{v.title.replace(/!!+/g, '!')}</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, font: mono, color: 'var(--text-2)' }}>
                <span>A {v.counts.A}</span>
                <span>B {v.counts.B}</span>
                <span>문법 {v.counts.grammar}</span>
                <span>난이도 {v.difficulty}</span>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── 보고서 ──
function Report({ r, progress, setProgress, onBack, mobile }) {
  const [filter, setFilter] = useState('all')
  const [hide, setHide] = useLocalStorage('hy_eng_hide', '0')
  const [revealed, setRevealed] = useState(() => new Set())
  const hidden = hide === '1'
  const p = progress[r.id] || {}
  const toggleStep = (k) => setProgress({ ...progress, [r.id]: { ...p, [k]: !p[k] } })

  const chunks = r.chunks.filter((c) => filter === 'all' || c.band === filter)
  const A = r.chunks.filter((c) => c.band === 'A').length

  const blur = (key) =>
    hidden && !revealed.has(key) ? { filter: 'blur(6px)', userSelect: 'none', cursor: 'pointer' } : null
  const reveal = (key) => {
    if (!hidden) return
    const n = new Set(revealed)
    n.has(key) ? n.delete(key) : n.add(key)
    setRevealed(n)
  }

  const jump = (id) => document.getElementById('eng-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div>
      <button onClick={onBack} style={{ ...btn(false), marginBottom: 12 }}>← 목록</button>

      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', font: mono, color: 'var(--text-3)' }}>
          <span>{r.channel}</span><span>{r.duration}</span><span>난이도 {r.difficulty}</span><span>{r.watched}</span>
          <a href={r.url} target="_blank" rel="noopener" style={{ marginLeft: 'auto', color: BLUE, textDecoration: 'none' }}>유튜브에서 열기 ↗</a>
        </div>
        <div style={{ fontSize: mobile ? 18 : 21, fontWeight: 700, marginTop: 8, lineHeight: 1.3 }}>{r.title.replace(/!!+/g, '!')}</div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 10, lineHeight: 1.65 }}>{r.summary}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 14 }}>
          {[['A 표현', A], ['B 표현', r.chunks.length - A], ['문법', r.grammar.length], ['쉐도잉', r.shadow.length]].map(([l, n]) => (
            <div key={l} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>{n}</div>
              <div style={{ font: mono, color: 'var(--text-3)' }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 섹션 점프 */}
      <div style={{ position: 'sticky', top: -6, zIndex: 3, background: 'var(--bg)', padding: '10px 0', margin: '10px 0 0', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[['loop', '순서'], ['chunks', '표현'], ['grammar', '문법'], ['shadow', '쉐도잉'], ['retell', '리텔'], ['hands', '핸드'], ['jargon', '은어']].map(([k, l]) => (
          <button key={k} onClick={() => jump(k)} style={{ ...btn(false), whiteSpace: 'nowrap' }}>{l}</button>
        ))}
      </div>

      {/* 학습 순서 + 진도 */}
      <div id="eng-loop" />
      <SectionTitle title="학습 순서" caption="60~90분 · 2~3일에 나눠서" />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {STEPS.map(([k, name, desc, time], i) => (
          <div
            key={k}
            onClick={() => toggleStep(k)}
            style={{ display: 'grid', gridTemplateColumns: '28px 84px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 18px', borderTop: i ? '1px solid var(--line)' : 'none', cursor: 'pointer', background: k === 'retell' ? 'var(--surface2)' : 'transparent' }}
          >
            <span style={{ width: 20, height: 20, borderRadius: 6, border: '1.5px solid ' + (p[k] ? 'var(--accent)' : 'var(--line)'), background: p[k] ? 'var(--accent)' : 'transparent', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
              {p[k] ? '✓' : ''}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, textDecoration: p[k] ? 'line-through' : 'none', color: p[k] ? 'var(--text-3)' : 'var(--text)' }}>{name}</span>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{desc}</span>
            <span style={{ font: mono, color: 'var(--text-3)' }}>{time}</span>
          </div>
        ))}
      </Card>

      {/* 표현 */}
      <div id="eng-chunks" />
      <SectionTitle title="표현" caption={`${r.chunks.length}개`} />
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
        <b>A</b>는 TOEFL/아카데믹에 그대로 나오는 것(영영 정의 포함), <b>B</b>는 스피킹에서 쓸 수 있는 구어 표현.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['all', '전체'], ['A', 'A · TOEFL'], ['B', 'B · 구어']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={btn(filter === k)}>{l}</button>
        ))}
        <button onClick={() => { setHide(hidden ? '0' : '1'); setRevealed(new Set()) }} style={{ ...btn(hidden), marginLeft: 'auto' }}>
          {hidden ? '뜻 보이기' : '뜻 가리기'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {chunks.map((c) => (
          <Card key={c.expr} style={{ padding: '16px 18px' }} >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{c.expr}</span>
              <span style={{ font: "700 10px 'JetBrains Mono'", padding: '2px 7px', borderRadius: 6, background: c.band === 'A' ? 'var(--accent)' : 'var(--surface2)', color: c.band === 'A' ? 'var(--accent-text)' : 'var(--text-2)' }}>{c.band}</span>
              <span style={{ marginLeft: 'auto' }}><Stamp url={r.url} sec={c.sec} label={c.t} /></span>
            </div>
            <div onClick={() => reveal(c.expr)} style={{ marginTop: 8, ...blur(c.expr) }}>
              {c.en && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.5 }}>{c.en}</div>}
              <div style={{ fontSize: 14, fontWeight: 600 }}>{c.ko}</div>
              {c.note && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.6 }}>{c.note}</div>}
            </div>
            <Quote>{c.quote}</Quote>
          </Card>
        ))}
      </div>

      {/* 문법 */}
      <div id="eng-grammar" />
      <SectionTitle title="문법 패턴" caption={`${r.grammar.length}개`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {r.grammar.map((g) => (
          <Card key={g.pattern} style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>{g.pattern}</span>
              <span style={{ marginLeft: 'auto' }}><Stamp url={r.url} sec={g.sec} label={g.t} /></span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{g.ko}</div>
            <Quote>{g.quote}</Quote>
            <div style={{ marginTop: 10, padding: '9px 13px', borderRadius: 10, background: 'var(--surface2)', fontSize: 13, lineHeight: 1.6 }}>
              <span style={{ font: "700 10px 'JetBrains Mono'", letterSpacing: '.06em', marginRight: 8 }}>TOEFL</span>{g.toefl}
            </div>
            <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.65 }}>{g.explain}</div>
          </Card>
        ))}
      </div>

      {/* 쉐도잉 */}
      <div id="eng-shadow" />
      <SectionTitle title="쉐도잉 구간" caption={`${r.shadow.length}구간`} />
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>은어가 적고 문장이 완결된 내레이션 구간. 구간 표시를 누르면 유튜브가 시작점에서 열린다.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {r.shadow.map((s) => (
          <Card key={s.from} style={{ padding: '16px 18px' }}>
            <Stamp url={r.url} sec={s.fromSec} label={`${s.from} → ${s.to} · ${s.toSec - s.fromSec}초`} />
            <div style={{ fontSize: 13, color: 'var(--text-2)', margin: '8px 0 10px', lineHeight: 1.6 }}>{s.why}</div>
            <div style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.55 }}>{s.text}</div>
          </Card>
        ))}
      </div>

      {/* 리텔 */}
      <div id="eng-retell" />
      <SectionTitle title="리텔 과제" caption="스피킹 · 제일 중요" />
      <Card style={{ padding: '16px 18px', border: '1px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{r.retell.hand}</span>
          <span style={{ marginLeft: 'auto' }}><Stamp url={r.url} sec={r.retell.fromSec} label={`${r.retell.from} → ${r.retell.to}`} /></span>
        </div>
        <div style={{ fontSize: 14, marginTop: 10, lineHeight: 1.65 }}>{r.retell.prompt}</div>
        <ol style={{ margin: '12px 0 0', padding: 0, listStyle: 'none' }}>
          {r.retell.skeleton.map((s, i) => (
            <li key={i} style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 14, lineHeight: 1.6 }}>
              <span style={{ font: "700 15px 'JetBrains Mono'", color: 'var(--text-3)' }}>{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Brad 원문 보기 (리텔 끝난 뒤에)</summary>
          <div style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.6, marginTop: 10 }}>{r.retell.model}</div>
        </details>
      </Card>

      {/* 핸드 */}
      <div id="eng-hands" />
      <SectionTitle title="핸드 목록" caption={`${r.hands.length}핸드 · 별표가 리텔 핸드`} />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {r.hands.map((h, i) => {
          const star = h.result.includes('★')
          return (
            <div key={h.t} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 12, padding: '10px 18px', borderTop: i ? '1px solid var(--line)' : 'none', background: star ? 'var(--surface2)' : 'transparent', fontSize: 13 }}>
              <Stamp url={r.url} sec={h.sec} label={h.t} />
              <div>
                <div style={{ fontWeight: 600 }}>{h.label}{star && ' ★'}</div>
                <div style={{ color: 'var(--text-2)' }}>{h.result.replace(' ★리텔', '')}</div>
              </div>
            </div>
          )
        })}
      </Card>

      {/* 은어 */}
      <div id="eng-jargon" />
      <SectionTitle title="포커 은어" caption={`${r.jargon.length}개 · 학습 대상 아님`} />
      <Card style={{ padding: '6px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', columnGap: 28 }}>
          {r.jargon.map((j) => (
            <div key={j.term} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,38%) 1fr', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <span style={{ fontFamily: SERIF, fontSize: 14 }}>{j.term}</span>
              <span style={{ color: 'var(--text-2)' }}>{j.ko}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function English() {
  const mobile = useIsMobile()
  const [index, setIndex] = useState(null)
  const [err, setErr] = useState('')
  const [openId, setOpenId] = useLocalStorage('hy_eng_open', '')
  const [report, setReport] = useState(null)
  const [progStr, setProgStr] = useLocalStorage('hy_eng_progress', '{}')
  const progress = (() => { try { return JSON.parse(progStr) || {} } catch { return {} } })()
  const setProgress = (p) => setProgStr(JSON.stringify(p))

  // GitHub Pages 가 JSON 을 캐시하므로 매번 cb 를 바꿔 새 보고서가 바로 보이게 한다
  useEffect(() => {
    fetch('/english/index.json?cb=' + Date.now())
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then(setIndex)
      .catch((e) => setErr('index.json 을 못 읽었다 (' + e.message + ')'))
  }, [])

  useEffect(() => {
    if (!openId) { setReport(null); return }
    let alive = true
    fetch(`/english/reports/${openId}.json?cb=` + Date.now())
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((r) => alive && setReport(r))
      .catch(() => alive && setOpenId(''))
    return () => { alive = false }
  }, [openId])

  return (
    <div style={fade}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, margin: '4px 0 16px' }}>
        <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)' }}>
          영어 · 포커 브이로그로 스피킹 뼈대 만들기
        </div>
        {index && (
          <span style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>
            보고서 {index.videos.length} · 누적 표현 {index.chunks.length}
          </span>
        )}
      </div>

      {err && <Card><div style={{ color: 'var(--text-2)', fontSize: 14 }}>{err}</div></Card>}
      {!index && !err && <div style={{ font: mono, color: 'var(--text-3)', padding: 20 }}>불러오는 중…</div>}
      {index && !openId && <VideoList index={index} progress={progress} onOpen={setOpenId} />}
      {index && openId && !report && <div style={{ font: mono, color: 'var(--text-3)', padding: 20 }}>보고서 여는 중…</div>}
      {report && <Report r={report} progress={progress} setProgress={setProgress} onBack={() => setOpenId('')} mobile={mobile} />}
    </div>
  )
}
