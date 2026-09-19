// 인스타 프로필 페이지(instagram.com/<핸들>/)에서 정확한 팔로워 수를 읽는다.
// Claude in Chrome 의 javascript_tool 에 이 파일 내용을 그대로 넣어 실행한다(lovelab_daily_prompt.md 참고).
// 헤더의 표시값은 "1.5만" 식으로 축약되므로 React fiber 의 follower_count 를 찾는다.
// 탐색은 반드시 순환 안전(WeakSet + 노드 2만 제한 + try/catch) — 안 그러면 렌더러가 멈춘다.
await new Promise(r => setTimeout(r, 2500));
(() => {
  const h = location.pathname.replace(/\//g, '');
  const start = document.querySelector('header a[href$="/followers/"]')
    || [...document.querySelectorAll('header *')].find(e => e.children.length < 3 && /팔로워|followers/i.test(e.textContent || '') && (e.textContent || '').length < 30)
    || document.querySelector('header');
  if (!start) return JSON.stringify({ h, err: 'no header', title: document.title });
  const fk = Object.keys(start).find(k => k.startsWith('__reactFiber$'));
  if (!fk) return JSON.stringify({ h, err: 'no fiber' });
  const visited = new WeakSet(); let count = 0; const found = [];
  function search(o, d) {
    if (!o || typeof o !== 'object' || d > 7 || count > 20000 || found.length) return;
    try { if (visited.has(o)) return; visited.add(o); } catch (e) { return; }
    count++;
    try { if (o === window || o instanceof Node) return; } catch (e) { return; }
    let v; try { v = o.follower_count; } catch (e) { return; }
    if (typeof v === 'number') { let u = null; try { u = o.username; } catch (e) {} found.push({ v, u }); return; }
    let keys; try { keys = Object.keys(o); } catch (e) { return; }
    for (const k of keys) {
      if (k === 'return' || k === 'child' || k === 'sibling' || k === 'alternate' || k === 'stateNode' || k === '_owner') continue;
      let c; try { c = o[k]; } catch (e) { continue; }
      search(c, d + 1); if (found.length) return;
    }
  }
  let f = start[fk], steps = 0;
  while (f && steps < 200 && !found.length && count <= 20000) { search(f.memoizedProps, 0); search(f.memoizedState, 0); f = f.return; steps++; }
  return JSON.stringify({ h, found: found[0] || null, steps, count });
})()
