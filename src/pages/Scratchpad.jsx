import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { Card } from '../components/ui.jsx'

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }

// 낙서장 — 자유 텍스트 입력. 내용은 localStorage(hy_scratch)에 자동 저장.
export default function Scratchpad() {
  const [text, setText] = useLocalStorage('hy_scratch', '')

  return (
    <div style={{ ...fade }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, margin: '4px 0 16px' }}>
        <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)' }}>
          낙서장 · 자유 메모 (자동 저장)
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{text.length}자</span>
          {text && (
            <button
              onClick={() => {
                if (confirm('낙서장 내용을 모두 지울까요?')) setText('')
              }}
              style={{
                font: "500 12px 'Pretendard Variable'",
                color: 'var(--text-2)',
                background: 'var(--surface2)',
                border: '1px solid var(--line)',
                borderRadius: 9,
                padding: '5px 12px',
                cursor: 'pointer',
              }}
            >
              비우기
            </button>
          )}
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="여기에 자유롭게 메모하세요. 입력하는 즉시 자동 저장됩니다."
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: '62vh',
            resize: 'vertical',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text)',
            padding: '22px 24px',
            fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
            fontSize: 15,
            lineHeight: 1.7,
            boxSizing: 'border-box',
          }}
        />
      </Card>
    </div>
  )
}
