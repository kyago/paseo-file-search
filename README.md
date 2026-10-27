# paseo-file-search

Paseo 워크스페이스의 파일을 이름·경로로 찾는 플러그인. 기본 파일 검색(Cmd+P)의 퍼지 매칭 잡음과 다중 단어 미지원을 대신한다.

- 띄어쓴 단어를 **모두 포함**하는 경로만 결과에 나온다(퍼지 없음, 한글 OK).
- 순위: 파일 이름 접두 > 파일 이름 포함 > 폴더 이름 포함, 그다음 얕고 짧은 경로.
- 진입: 탐색기(오른쪽 사이드바) "파일 검색" 탭, Cmd+K → "파일 검색". Enter = 첫 결과 열기.
- 열기: 워크스페이스 라우트의 `?open=file:` 인텐트로 Paseo 내장 파일 탭을 연다(데스크톱·웹). 폰 앱에서는 경로를 복사한다.
- 파일 목록: `rg --files`(없으면 `git ls-files`, 그다음 디렉터리 순회), 10초 캐시. `.gitignore`·숨김 항목 제외.

## 개발

```bash
npm install
npm run typecheck
npm test
paseo plugin add ~/paseo-file-search   # 디렉터리 설치
paseo plugin reload file-search        # 수정 반영
```

환경변수 `FILE_SEARCH_RG`로 ripgrep 경로를 지정할 수 있다.
