// ─────────────────────────────────────────────────────────────
// Microsoft 로그인(MSAL) → Graph access token 발급.
//
// 정적 사이트에서 비밀키 없이 안전하게 토큰을 받는 표준 방식(PKCE).
// 사용자가 한 번 로그인하면 토큰을 받아 outlook.js 의 setGraphToken() 에
// 꽂아준다. 토큰은 만료 전 acquireTokenSilent 로 자동 갱신된다.
//
// 사전 준비(.env.local 또는 배포 환경변수):
//   VITE_MSAL_CLIENT_ID = Azure 앱 등록의 '애플리케이션(클라이언트) ID'
//   VITE_MSAL_TENANT    = 'common'(기본) | 'organizations' | 테넌트 ID
//                          개인 Outlook.com 포함이면 'common' 그대로 두면 된다.
// Azure 앱 등록 시 리디렉션 URI(플랫폼=SPA)에 이 사이트 주소를 등록해야 한다.
// ─────────────────────────────────────────────────────────────

import {
  PublicClientApplication,
  InteractionRequiredAuthError,
} from '@azure/msal-browser'
import { setGraphToken } from './outlook.js'

const CLIENT_ID = readEnv('VITE_MSAL_CLIENT_ID')
const TENANT = readEnv('VITE_MSAL_TENANT') || 'common'
const SCOPES = ['Mail.Read']

function readEnv(key) {
  try {
    return import.meta.env?.[key] || null
  } catch {
    return null
  }
}

// Azure 클라이언트 ID 가 설정돼 있어야 로그인 UI 를 노출한다.
export function isMsalConfigured() {
  return !!CLIENT_ID
}

let instance = null
let initPromise = null

// MSAL v5 는 사용 전 initialize() 가 필요하므로 한 번만 수행한다.
async function getInstance() {
  if (!CLIENT_ID) throw new Error('VITE_MSAL_CLIENT_ID 미설정')
  if (!instance) {
    instance = new PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'localStorage' },
    })
  }
  if (!initPromise) initPromise = instance.initialize()
  await initPromise
  return instance
}

// 캐시 계정으로 조용히 토큰 획득. 만료/상호작용 필요 시 팝업으로 폴백.
async function acquire(inst, account, allowPopup) {
  try {
    const res = await inst.acquireTokenSilent({ scopes: SCOPES, account })
    return res.accessToken
  } catch (e) {
    if (allowPopup && e instanceof InteractionRequiredAuthError) {
      const res = await inst.acquireTokenPopup({ scopes: SCOPES, account })
      return res.accessToken
    }
    throw e
  }
}

// 로그인 버튼 핸들러: 팝업 로그인 → 토큰 발급 → outlook.js 주입.
export async function signIn() {
  const inst = await getInstance()
  let account = inst.getActiveAccount() || inst.getAllAccounts()[0]
  if (!account) {
    const res = await inst.loginPopup({ scopes: SCOPES, prompt: 'select_account' })
    account = res.account
  }
  inst.setActiveAccount(account)
  const token = await acquire(inst, account, true)
  setGraphToken(token)
  return token
}

// 페이지 로드 시 1회: 이전에 로그인했던 세션이 있으면 팝업 없이 토큰만 복구.
export async function restoreSession() {
  if (!CLIENT_ID) return null
  const inst = await getInstance()
  const account = inst.getActiveAccount() || inst.getAllAccounts()[0]
  if (!account) return null
  inst.setActiveAccount(account)
  try {
    const token = await acquire(inst, account, false)
    setGraphToken(token)
    return token
  } catch {
    return null // 조용히 실패 → 데모로 동작
  }
}

// 로그아웃: 토큰 제거 + 로컬 캐시 비움(팝업 없이). 배지는 다시 '데모'로.
export async function signOut() {
  setGraphToken(null)
  if (!instance) return
  try {
    await instance.clearCache()
  } catch {
    /* noop */
  }
}
