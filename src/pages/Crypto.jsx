import { useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { Card, mono } from '../components/ui.jsx'
import { Markdown, SubTabs, btn } from './Holdem.jsx'

// 크립토 — The Block 뉴스를 읽기 전에 어휘·표현을 먼저 공부하는 탭 (홀덤 탭과 같은 구조).
// 데이터는 public/crypto/ (공개 번들, 암호화 대상 아님). Claude 가 그날 기사에서 뽑아 쓴 정리본.
//   index.json    guides(기초 용어 등) + days(날짜별 어휘 노트, 최신이 앞)
//   <id>.md       홀덤 탭과 같은 마크다운 문법. 기사마다 원문 링크 필수.
// 읽음 체크는 localStorage hy_crypto_done.

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }

export default function Crypto() {
  const mobile = useIsMobile()
  const [index, setIndex] = useState(null)
  const [err, setErr] = useState('')
  const [cur, setCur] = useLocalStorage('hy_crypto_doc', '')
  const [doneStr, setDoneStr] = useLocalStorage('hy_crypto_done', '{}')
  const [text, setText] = useState('')
  const done = (() => { try { return JSON.parse(doneStr) || {} } catch { return {} } })()

  useEffect(() => {
    fetch('/crypto/index.json?cb=' + Date.now()).then((r) => r.json()).then((ix) => {
      setIndex(ix)
      const first = (ix.days || [])[0] || (ix.guides || [])[0]
      if (first && (!cur || ![...(ix.days || []), ...(ix.guides || [])].some((d) => d.id === cur))) setCur(first.id)
    }).catch((e) => setErr('목록을 못 불러왔다: ' + e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!cur) return
    let alive = true
    setText('')
    fetch(`/crypto/${cur}.md?cb=` + Date.now()).then((r) => r.text()).then((t) => alive && setText(t)).catch(() => alive && setText('# 불러오기 실패'))
    return () => { alive = false }
  }, [cur])

  const docs = [...(index?.days || []), ...(index?.guides || [])]
  const doc = docs.find((c) => c.id === cur)
  const toggleDone = () => setDoneStr(JSON.stringify({ ...done, [cur]: !done[cur] }))

  return (
    <div style={fade}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, margin: '4px 0 16px' }}>
        <div style={{ font: mono, color: 'var(--text-3)' }}>{index ? `${index.source} · 어휘 노트 ${index.days?.length || 0}일${index.guides?.length ? ' + 가이드 ' + index.guides.length : ''}` : ''}</div>
        <div style={{ font: mono, color: 'var(--text-3)' }}>읽음 {Object.values(done).filter(Boolean).length}</div>
      </div>
      {err && <Card><div style={{ color: 'var(--text-2)', fontSize: 14 }}>{err}</div></Card>}
      {index && (
        <>
          <SubTabs value={cur} onChange={setCur} items={docs.map((c) => [c.id, `${c.tab}${done[c.id] ? ' ✓' : ''}`])} />
          {doc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ font: mono, color: 'var(--text-3)' }}>{doc.title}{doc.articles ? ` · 기사 ${doc.articles}개` : ''}{doc.words ? ` · 어휘 ${doc.words}개` : ''}</span>
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
