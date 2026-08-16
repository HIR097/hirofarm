import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { ensureUnlocked } from './lib/gate.js'

// App 을 정적으로 import 하지 않고 잠금 해제 뒤에 동적으로 불러온다.
// ES 모듈은 import 시점에 본문이 즉시 실행되므로, 정적으로 걸어두면
// data 모듈들이 window.__HY_DATA__ 가 채워지기 전에 값을 읽어 빈 데이터로 굳는다.
ensureUnlocked()
  .then(() => import('./App.jsx'))
  .then(({ default: App }) => {
    createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
