# paseo-file-search

Paseo 워크스페이스의 파일을 이름·경로로 찾아 채팅에 참조로 넣거나 파일 탭으로 여는 플러그인. 기본 파일 검색(Cmd+P)의 퍼지 매칭 잡음과 다중 단어 미지원을 대신한다.

- 띄어쓴 단어를 **모두 포함**하는 경로만 결과에 나온다(퍼지 없음, 한글 OK). 일치하는 폴더는 `이름/`으로 앞에 최대 8개.
- 순위: 파일 이름 접두 > 파일 이름 포함 > 폴더 이름 포함, 그다음 얕고 짧은 경로.
- 진입은 한 곳: 채팅 입력창 위 **"파일 검색" 알약**. 아직 에이전트가 없는 새 세션에는 알약 슬롯이 없어서 그때만 워크스페이스 상단 🔍 버튼이 대신 보인다(데스크톱·웹에서 알약이 보이면 숨김).
- 팝오버: ↑/↓로 고르고 Enter 또는 클릭 → 입력창 커서 위치에 `"상대/경로"`(네이티브 `@`와 같은 형식). 파일 행의 **열기**는 Paseo 내장 파일 탭으로 연다(`?open=file:` 라우트, 데스크톱·웹). 폰 앱은 둘 다 경로 복사로 대체.
- 단축키(기본 `Cmd+Shift+O`, Settings → Plugins → 파일 검색 → Options에서 변경·끄기): 워크스페이스 어디서든 알약(없으면 헤더 버튼) 팝오버를 연다. `Mod`는 Mac에서 Cmd, 그 외 Ctrl. 한 글자만 적으면 입력창 단어 첫머리에 그 글자를 칠 때 열리는 문자 트리거.
- 파일 목록: `rg --files`(없으면 `git ls-files`, 그다음 디렉터리 순회), 10초 캐시. `.gitignore`·숨김 항목 제외.
- 한계: 플러그인 SDK에 입력창·파일 열기 API가 없어 DOM 키 이벤트, `data-testid="message-input-root"`, `?open=file:` 라우트에 기댄다. 데스크톱·웹 전용이고 Paseo 업데이트로 깨질 수 있다.

## 개발

```bash
npm install
npm run typecheck
npm test
paseo plugin add ~/paseo-file-search   # 디렉터리 설치
paseo plugin reload file-search        # 수정 반영
paseo plugin logs file-search          # 클라이언트 진단(files.log)도 여기로
```

환경변수 `FILE_SEARCH_RG`로 ripgrep 경로를 지정할 수 있다.
