팔로워 트래커 일일 스냅샷을 수집해 반영해라. 사람에게 묻지 말고 끝까지 진행한다.

1. `secure/lovelab-data.js` 의 `cast` 에서 핸들 목록을 읽는다.
2. `tools/lovelab_collect.js` 를 읽는다. 이 내용을 그대로 javascript_tool 의 text 로 쓴다.
3. Claude in Chrome 으로 새 탭을 하나 만들고, 핸들마다 `https://www.instagram.com/<핸들>/` 로 navigate 한 뒤 위 JS 를 실행한다.
   - browser_batch 로 묶되 **한 번에 계정 4개(navigate+js 8액션)까지만**. 더 묶으면 응답이 유실된다.
   - 결과 JSON 의 `found.u` 가 핸들과 같을 때만 `found.v` 를 채택한다. 실패한 계정은 대기 시간을 4500 으로 늘려 한 번 더 시도한다.
   - 로그인 화면으로 넘어가거나 전 계정이 실패하면 수집을 중단하고 이유만 출력한다(데이터 파일은 건드리지 않는다).
   - `web_profile_info` API 와 `window.require` 는 쓰지 않는다(429 / 차단).
4. 전 계정이 모이면 `{"핸들": 숫자, ...}` 를 **Write 도구로** `tools/__pycache__/lovelab_counts.json` 에 쓰고(gitignore 된 폴더), 다음을 **한 줄 그대로, 다른 명령과 묶지 말고** 실행한다(`;`·`$env:`·변수 확장을 붙이면 권한에서 거부된다):
   `py -3 tools/lovelab_apply.py tools/__pycache__/lovelab_counts.json`
   이 스크립트가 pull·스냅샷 추가·lock·커밋·푸시를 한다. 스크립트가 거부하면(누락·급변) 억지로 넣지 말고 메시지를 그대로 출력한다.
5. 만든 탭을 닫고, 한 줄로 결과를 출력한다(날짜, 성공 수, 내 계정 팔로워).
