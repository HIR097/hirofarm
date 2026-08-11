import { IconClose, IconMail } from './icons.jsx'
import { BLUE, BLUE_BG } from './ui.jsx'

const URGENT = '#e5484d'

// 오른쪽에서 슬라이드되는 알림 위젯 — Outlook 메일을 업무로 추가 제안.
// macOS 알림센터 위젯처럼 화면 오른쪽에 떠서, 각 메일을 검토 후 펀드 컬럼에
// '추가' 하거나 '무시' 할 수 있다.
export default function NotifyPanel({ open, onClose, assets, mail, onAdd }) {
  const { suggestions, loading, live, configured, authBusy, update, dismiss, refresh, signIn, signOut } = mail

  const add = (s) => {
    onAdd(s.fundKey, {
      title: s.suggestTitle,
      desc: s.suggestDesc,
      due: s.suggestDue || null,
      urgent: s.urgent,
    })
    dismiss(s.id)
  }

  return (
    <>
      {/* 배경 클릭 시 닫힘 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: open ? 'rgba(8,8,12,.32)' : 'transparent',
          backdropFilter: open ? 'blur(2px)' : 'none',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'background .25s ease',
        }}
      />

      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(400px, 92vw)',
          zIndex: 61,
          background: 'var(--bg2)',
          borderLeft: '1px solid var(--line)',
          boxShadow: '-12px 0 40px rgba(8,8,12,.18)',
          transform: open ? 'translateX(0)' : 'translateX(105%)',
          transition: 'transform .32s cubic-bezier(.22,.61,.36,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 헤더 */}
        <div style={{ padding: '20px 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <IconMail size={18} stroke="var(--text)" />
              <span style={{ fontSize: 17, fontWeight: 700 }}>메일 알림</span>
              <span
                style={{
                  font: "600 10px 'JetBrains Mono'",
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: live ? BLUE_BG : 'var(--surface2)',
                  color: live ? BLUE : 'var(--text-3)',
                }}
              >
                {live ? 'Outlook 연동' : '데모'}
              </span>
            </div>
            <button onClick={onClose} style={iconBtn} aria-label="닫기">
              <IconClose />
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Outlook 메일을 업무현황에 추가하도록 제안합니다. 펀드·일자를 확인하고 추가하세요.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} style={refreshBtn}>
              새로고침
            </button>
            {/* Azure 클라이언트 ID 가 설정된 경우에만 로그인 UI 노출 */}
            {configured &&
              (live ? (
                <button onClick={signOut} disabled={authBusy} style={authBtn}>
                  {authBusy ? '처리 중…' : '로그아웃'}
                </button>
              ) : (
                <button onClick={signIn} disabled={authBusy} style={{ ...authBtn, color: BLUE, borderColor: BLUE }}>
                  {authBusy ? '로그인 중…' : 'Outlook 로그인'}
                </button>
              ))}
          </div>
        </div>

        {/* 제안 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <Empty text="메일을 불러오는 중…" />}
          {!loading && suggestions.length === 0 && <Empty text="새로운 제안이 없습니다." />}
          {!loading &&
            suggestions.map((s) => (
              <SuggestionCard key={s.id} s={s} assets={assets} onUpdate={update} onAdd={add} onDismiss={dismiss} />
            ))}
        </div>
      </aside>
    </>
  )
}

function SuggestionCard({ s, assets, onUpdate, onAdd, onDismiss }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `1px solid ${s.urgent ? 'rgba(229,72,77,.35)' : 'var(--line)'}`,
        borderLeft: `3px solid ${s.urgent ? URGENT : BLUE}`,
        borderRadius: 15,
        boxShadow: 'var(--shadow)',
        padding: '14px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        animation: 'hyFade .3s ease',
      }}
    >
      {/* 발신 + 수신시각 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.from}
        </span>
        {s.received && (
          <span style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)', flex: 'none' }}>
            {fmtTime(s.received)}
          </span>
        )}
      </div>

      {/* 제목 */}
      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{s.suggestTitle}</div>

      {/* 본문 미리보기 */}
      {s.preview && (
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {s.preview}
        </div>
      )}

      {/* 검토 옵션: 펀드 / 일자 / 긴급 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <select
          value={s.fundKey}
          onChange={(e) => onUpdate(s.id, { fundKey: e.target.value })}
          style={miniInput}
        >
          {assets.map((a) => (
            <option key={a.key} value={a.key}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          value={s.suggestDue}
          onChange={(e) => onUpdate(s.id, { suggestDue: e.target.value })}
          placeholder="일자"
          style={{ ...miniInput, width: 96, color: s.suggestDue ? BLUE : 'var(--text)', fontWeight: s.suggestDue ? 700 : 400 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', font: "600 11px 'JetBrains Mono'", color: s.urgent ? URGENT : 'var(--text-3)' }}>
          <input
            type="checkbox"
            checked={s.urgent}
            onChange={(e) => onUpdate(s.id, { urgent: e.target.checked })}
            style={{ width: 15, height: 15, accentColor: URGENT, cursor: 'pointer' }}
          />
          긴급
        </label>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onDismiss(s.id)} style={{ ...cardBtn, background: 'var(--surface2)', color: 'var(--text-2)' }}>
          무시
        </button>
        <button onClick={() => onAdd(s)} style={{ ...cardBtn, background: 'var(--accent)', color: 'var(--accent-text)' }}>
          업무 추가
        </button>
      </div>
    </div>
  )
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '40px 0' }}>{text}</div>
  )
}

function fmtTime(iso) {
  // 'YYYY-MM-DDТHH:mm' → 'M/D HH:mm' (로케일 의존 없이 안전하게 파싱).
  const m = String(iso).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return ''
  return `${Number(m[2])}/${Number(m[3])} ${m[4]}:${m[5]}`
}

const iconBtn = {
  width: 32,
  height: 32,
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--text-2)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const refreshBtn = {
  alignSelf: 'flex-start',
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--text-2)',
  font: "600 11px 'JetBrains Mono'",
  cursor: 'pointer',
}

const authBtn = {
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--text-2)',
  font: "600 11px 'JetBrains Mono'",
  cursor: 'pointer',
}

const miniInput = {
  padding: '5px 8px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'var(--bg2)',
  color: 'var(--text)',
  font: "500 12px 'Pretendard Variable'",
  outline: 'none',
}

const cardBtn = {
  flex: 1,
  padding: '8px 0',
  borderRadius: 10,
  border: 'none',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
