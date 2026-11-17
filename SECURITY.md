# 보안 안내 · Security

**한국어** | [English](#english)

## 키를 다루는 방식

- 이 사이트에는 서버가 없습니다. 사이트 운영자는 키와 책 내용을 받지 않습니다.
- 키는 브라우저의 자바스크립트 메모리에만 있습니다. localStorage, sessionStorage, IndexedDB, 작업 파일, 환경 설정 파일 어디에도 저장하지 않습니다.
- 키는 탭을 닫거나, 새로 고침하거나, 정한 시간(기본 20분, 5~60분) 동안 쓰지 않으면 지워집니다. [키 지우고 끝내기]를 누르면 바로 지워집니다.
- 화면에는 키의 끝 4자리만 보입니다.
- 키가 갈 수 있는 곳은 Google(`generativelanguage.googleapis.com`), OpenAI(`api.openai.com`), Anthropic(`api.anthropic.com`)의 AI 주소뿐입니다. 사이트의 콘텐츠 보안 정책(CSP)이 다른 주소로 보내는 요청을 막습니다.
- 예전 버전이 브라우저에 저장해 둔 키는 새 버전을 처음 열 때 지웁니다.

## 브라우저에 남는 것

- 만들던 책(글과 그림)
- AI 사용량 숫자(글 요청 수, 그림 장수)
- 설정(언어, 연결 목록, 그림 한도, 자리 비움 시간). 키는 들어 있지 않습니다.

공용 컴퓨터에서는 다 쓴 뒤 [키 지우고 끝내기]를 누르고 브라우저를 닫으십시오. 책을 남기고 싶지 않으면 [작업 파일 받기]로 파일을 받은 뒤 처음 화면의 [이 컴퓨터에서 만들던 책 지우기]를 누르십시오.

## 키 주인이 할 일

- 각 회사 화면에서 예산이나 사용 한도를 걸어 두십시오.
  - OpenAI: [Spend limits](https://developers.openai.com/api/docs/guides/spend-limits)
  - Anthropic: [Workspaces](https://platform.claude.com/docs/en/manage-claude/workspaces)의 월 지출 한도
  - Google: [Billing](https://aistudio.google.com/docs/billing)의 프로젝트 지출 한도
- 가능하면 키를 쓸 수 있는 범위를 좁히십시오. Google Cloud의 [API 키 문서](https://docs.cloud.google.com/docs/authentication/api-keys)는 웹사이트(HTTP 리퍼러) 제한을 거는 방법을 설명합니다. 다만 이 사이트는 개인정보를 줄이려고 요청에 리퍼러를 보내지 않으므로(`no-referrer`), 웹사이트 제한을 건 키는 이 사이트에서 거절될 수 있습니다. 또 AI Studio에서 만든 Gemini 키에 웹사이트 제한을 걸 수 있는지는 공식 문서에서 확인하지 못했습니다. 그래서 위의 예산·한도를 먼저 걸어 두기를 권합니다.
- 수업에서는 학생마다 따로 만든 키나 한도를 건 키를 쓰고, 수업이 끝나면 키를 없애거나 새로 만드십시오.

## 사이트를 지키는 방법

- 빌드된 페이지에 콘텐츠 보안 정책(CSP)을 넣습니다. 스크립트와 스타일은 이 사이트의 파일만 쓰고, 인라인 스크립트와 `eval`을 허용하지 않습니다.
- 다른 사이트 안(iframe)에서 열리면 앱을 띄우지 않고 새 창에서 열라는 안내만 보여 줍니다.
- 작업 파일과 설정 파일을 불러올 때 크기, 형식, 값의 범위를 검사합니다. 그림은 `data:image/(png|jpeg|webp|gif|svg+xml)` 형식만 받고, 그림은 `<img>`로만 그립니다. 코드에서 HTML 문자열을 직접 넣는 것을 검사 규칙으로 막습니다.
- 설정 파일 안에 키처럼 보이는 글자가 있으면 버립니다.
- GitHub Actions는 커밋 SHA로 고정한 액션만 쓰고, 배포 때 `npm audit`으로 알려진 취약점을 검사합니다. Dependabot이 매주 업데이트를 제안합니다.

## 취약점 알리기

- 공개 이슈에 올리지 마십시오.
- GitHub 저장소의 Security 탭에서 [Report a vulnerability]를 눌러 비공개로 알려 주십시오. 방법: [GitHub 문서](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
- 받은 날로부터 7일 안에 확인 답변을 드리는 것을 목표로 합니다. 고칠 일정은 확인한 뒤 알려 드립니다.

---

## English

### How keys are handled

- The site has no server. The site operator does not receive your key or your book.
- The key lives only in the browser's JavaScript memory. It is never saved to localStorage, sessionStorage, IndexedDB, the work file, or the settings file.
- The key is cleared when you close the tab, reload, or leave the site unused for the set time (20 minutes by default, 5 to 60). [Clear keys and finish] clears it at once.
- Only the last 4 characters of a key are ever shown.
- A key can go only to the AI addresses of Google (`generativelanguage.googleapis.com`), OpenAI (`api.openai.com`), and Anthropic (`api.anthropic.com`). The site's Content Security Policy blocks requests to any other address.
- Keys saved in the browser by an earlier version are removed the first time the new version opens.

### What stays in the browser

- The book you are making (text and pictures)
- AI usage counts (text requests and pictures)
- Settings (language, connection list, picture limit, away time), without keys

On a shared computer, press [Clear keys and finish] when you are done and close the browser. If the book should not stay, save it with [Save work file] and press [Delete the book on this computer] on the start screen.

### What key owners should do

- Set a budget or usage limit on each company's pages: OpenAI [Spend limits](https://developers.openai.com/api/docs/guides/spend-limits), Anthropic [Workspaces](https://platform.claude.com/docs/en/manage-claude/workspaces) monthly spend limit, Google [Billing](https://aistudio.google.com/docs/billing) project spend cap.
- Narrow where a key can be used when possible. Google Cloud's [API keys page](https://docs.cloud.google.com/docs/authentication/api-keys) explains website (HTTP referrer) restrictions. This site sends no referrer (`no-referrer`) to share less, so a key with a website restriction may be refused here. The official docs also do not say whether Gemini keys made in AI Studio accept website restrictions. So setting the budget or limit above comes first.
- In class, use separate keys or keys with limits, and delete or replace them after the class.

### How the site is protected

- The built page carries a Content Security Policy: scripts and styles come only from the site's own files, with no inline scripts and no `eval`.
- Inside another site's frame (iframe), the app does not start and only offers to open in a new window.
- Work files and settings files are checked for size, format, and value ranges on import. Pictures must be `data:image/(png|jpeg|webp|gif|svg+xml)` and are drawn only with `<img>`. A lint rule blocks inserting HTML strings in code.
- Key-like text found in a settings file is thrown away.
- GitHub Actions use actions pinned to commit SHAs, and deployment runs `npm audit` for known vulnerabilities. Dependabot proposes updates weekly.

### Reporting a vulnerability

- Do not open a public issue.
- Use [Report a vulnerability] in the repository's Security tab to report privately. See the [GitHub docs](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).
- We aim to reply within 7 days of receiving a report, and will share a fix schedule after confirming the problem.
