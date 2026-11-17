# 개발 문서

이 문서는 "나만의 AI 동화책" 코드를 읽고 고치려는 개발자를 위한 글이에요. 사용자용 문서는 [README](../README.kr.md)에 있어요.

## 폴더 구조

| 폴더 / 파일 | 하는 일 |
|---|---|
| `src/App.tsx`, `src/main.tsx` | 앱의 시작점과 화면 고르기 |
| `src/screens/` | 화면 하나가 파일 하나예요. 시작, AI 연결하기, 이야기 씨앗, 줄거리, 쪽 나누기, 그림체, 그림, 꾸미기, 완성, 권리 안내. 화면마다 CSS와 검사 파일이 있어요. |
| `src/components/` | 여러 화면이 함께 쓰는 부품 (`Shell`, `PageView`, `Notice`) |
| `src/editor/` | 꾸미기 화면의 글상자 편집 (`EditableTextBox.tsx`, 자리 계산 `geometry.ts`) |
| `src/providers/` | AI 연결부. 회사별(Gemini, Claude, OpenAI) 글·그림 연결부, 가짜(연습용) 연결부, 오류 흉내가 있어요. 아래 "AI 연결부 구조"를 보세요. |
| `src/store/` | 상태 저장소 (zustand). `book_store.ts`, `book_model.ts`, `settings_store.ts` |
| `src/storage/` | 저장. `db.ts`(IndexedDB), `autosave.ts`, `book_file.ts`(작업 파일) |
| `src/export/` | 내보내기 (`export_book.ts`: PDF, 인쇄용 PDF, 그림 묶음) |
| `src/art/` | 예시 그림. `scenes.ts`의 SVG 장면을 코드로 그려요. |
| `src/data/` | 체험판 책과 예시 이야기 (`demo_book.ts`, `sample_story.ts`) |
| `src/i18n/` | 화면 문구. `ko.json`, `en.json`, `index.ts` |
| `src/styles/` | 전체 CSS (`global.css`, 글꼴 `@font-face` 포함) |
| `src/utils/` | 작은 도구 함수 (`image.ts`, `use_element_width.ts`) |
| `src/test/` | 검사 설정 (`setup.ts`) |
| `src/constants.ts` | 앱 전체의 상수 |
| `src/types.ts` | 자료 모양 |
| `public/fonts/` | 글꼴 woff2와 라이선스 전문 (`*-OFL.txt`) |
| `e2e/` | Playwright 검사 |
| `scripts/` | `check-secrets.mjs`, `check-i18n.mjs`, `screenshots.mjs` |
| `docs/` | 문서와 화면 사진(`docs/images/`) |

## 실행 방법

Node 20 이상이 필요해요.

```
npm install
npm run dev
```

- `npm run dev`는 개발 서버를 열어요. 주소는 터미널에 나와요. `vite.config.ts`의 `base`는 상대 경로(`./`)라서 같은 빌드가 어느 경로에서든 열려요.
- `npm run build`는 `dist/`에 배포용 파일을 만들어요.
- `npm run preview`는 만든 것을 미리 봐요.

## 검사 명령

| 명령 | 하는 일 |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 검사 (`tsc --noEmit`) |
| `npm run test` | Vitest 단위 검사. `src/`와 `scripts/` 아래의 `*.test.ts(x)`를 돌려요. |
| `npm run e2e` | Playwright 검사. 앱을 빌드해서 `vite preview`로 띄우고(포트 4173), 태블릿(1024x768)과 휴대폰(390x844) 두 크기에서 돌려요. |
| `npm run build` | 배포용 빌드 |
| `npm run check:secrets` | 코드에 키가 들어갔는지 찾아요. |
| `npm run check:i18n` | 한국어와 영어 문구의 키가 같은지 봐요. |
| `npm run check:links` | README와 `docs/` 안의 상대 경로 링크와 그림이 모두 실제 파일을 가리키는지 봐요. |
| `npm run screenshots` | 화면 사진을 찍어요. 먼저 `npm run build` 후 `npx vite preview --port 4173`을 띄워 두고, `SHOT_LANG=ko`와 `SHOT_LANG=en`으로 한 번씩 돌려요. `docs/images/ko/`, `docs/images/en/`에 같은 이름으로 들어가고, 휴대폰 크기(390x844) 사진 `phone.png`도 찍어요. |
| `npm run demo-gif` | 연습 모드로 책 한 권을 만들며 움직이는 시연 `docs/images/ko/demo.gif`, `docs/images/en/demo.gif`를 만들어요. 빌드하고 미리보기 서버(포트 4174)를 스스로 띄워요. Playwright로 장면을 찍고 순수 JS 인코더(`gifenc`)로 묶어요. 길이 12~20초, 5MB 이하가 아니면 실패해요. |
| `npm run social-card` | 저장소 소개 카드 `docs/images/social-preview.png`(1280x640)를 HTML로 그려 찍고, 같은 그림을 링크 미리보기용 `public/og-image.png`로도 넣어요. 글자가 가장자리 80px 안쪽에 있는지 확인해요. |
| `npx playwright test e2e/live-cors.spec.ts` | 키 없이 실제 서버로 보내는 브라우저 검사. 세 회사 연결부가 실제로 보내는 주소, 머리글, 본문 그대로 키 값만 빈 문자열로 바꿔 Playwright Chromium에서 보내요. HTTP 상태(예: 401)를 읽으면 통과이고, 요청 자체가 실패("Failed to fetch")하면 실패예요. 9가지 호출을 봐요. Gemini 키 확인·글·그림, Claude 키 확인·글·글(이어받기를 켠 종류), OpenAI 키 확인·글·그림이에요. 키가 없어서 돈이 들지 않아요. 인터넷이 있어야 하고, tablet 크기에서만 한 번 돌아요. `npm run e2e`에 들어 있어서 GitHub의 "End-to-end tests" 워크플로에서도 돌아요. |
| `npx playwright test e2e/real-api.spec.ts` | 실제 키로 호출하는 검사. `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` 중 환경 변수에 있는 회사만 돌고, 없는 것은 건너뛰어요. |

코드를 고친 뒤에는 `lint`, `typecheck`, `test`, `build`를 모두 통과해야 해요.

## 연습 모드와 오류 흉내

키 없이 AI 단계를 확인하려면 주소 끝에 `?mock=1`을 붙여요.

- 가짜 연결부(`mock_text.ts`, `mock_image.ts`)가 미리 준비된 예시 이야기와 그림을 돌려줘요.
- 주소에 `mock`이 있으면 켜져요. (`settings_store.ts`의 `practice`)
- 시작 화면에는 [연습 모드]로 보여요.
- 실제 AI로는 아무 요청도 가지 않아요.

오류 화면을 확인하려면 `?mock=1&mockfail=quota|rate|blocked|network`를 붙여요. (`src/providers/mock_failure.ts`)

| 값 | 흉내 내는 오류 (`ProviderError`의 kind) |
|---|---|
| `quota` | `quota_daily` (하루 한도) |
| `rate` | `rate` (분당 한도. 약 2초 뒤에 풀려요.) |
| `blocked` | `blocked` (안전 때문에 막힘) |
| `network` | `network` (인터넷 끊김) |

- 각 동작은 처음 한 번만 실패하고, 다시 하면 성공해요.
- 자동 검사에서 쓰려고 만들었어요.

## 자료 모양

`src/types.ts`에 있어요. 작업 파일(`.storybook.json`)에는 `Book`이 그대로 들어가요.

- **`Book`**: 책 한 권. `format_version`(지금은 1), `id`, `lang`, `author`, `seed`(이야기 씨앗), `write_mode`(`ai` 또는 `self`), 줄거리 제안 `plots`와 고른 줄거리 `chosen_plot`, `style_id`, `pages`, 마지막 단계 `step`, `updated_at`이 있어요. `plots_key`와 `pages_key`는 같은 입력이면 AI를 다시 부르지 않으려고 두는 열쇠예요.
- **`BookPage`**: 쪽 하나. `pages[0]`이 표지(`kind: 'cover'`)이고 그 뒤가 본문(`'story'`)이에요. 표지의 글이 책 제목이에요. `text`, `image_prompt`(그림 설명), `image`, `layout`, `text_box`가 있어요.
- **`TextBox`**: 글상자. `x`, `y`, `w`, `h`는 쪽 크기에 대한 퍼센트(0~100)예요. `font_id`(`round`, `plain`, `hand`), `font_size`(쪽 너비를 `PAGE_REF_SIZE`로 봤을 때의 px), `color`, `align`, `background`(`none`, `white`, `bubble`)가 있어요.
- **`PageImage`**: `data_url`, `source`(`ai` 또는 `upload`), AI로 만들었을 때의 `model_name`이에요. `source`가 `ai`인 그림이 하나라도 있으면 "만든 사람" 쪽에 AI 표시가 들어가요.

저장 위치는 이렇게 달라요.

- 만들던 책: 브라우저의 IndexedDB (`src/storage/db.ts`)
- 설정(언어, 연결 목록, 그림 한도, 자리 비움 시간)과 오늘 쓴 양: localStorage (`storybook.settings`, `storybook.usage`). 키는 들어가지 않아요.
- 키: 자바스크립트 메모리(`src/store/settings_store.ts`의 `connections[].key`)에만 있어요. 어디에도 저장하지 않아요. 자리 비움 타이머는 `src/components/KeySafety.tsx`의 `IdleGuard`예요.
- 환경 설정 파일: `src/storage/settings_file.ts` (키 없음, 64KB 이하)
- 서버는 없어요. 빌드한 `index.html`에는 `vite.config.ts`의 `security_meta`가 CSP와 `no-referrer` 메타 태그를 넣어요.

## AI 연결부 구조

파일은 `src/providers/`에 있어요.

| 파일 | 하는 일 |
|---|---|
| `provider_kinds.ts` | 키 앞머리로 회사를 알아보는 `detect_provider`, 회사별 기본 AI 종류와 고를 수 있는 종류, 키 받는 곳 주소를 모아 둬요. 저장된 AI 종류가 그 회사 것이 아니면 회사 기본값을 쓰는 `resolve_text_model`, `resolve_image_model`도 여기 있어요. |
| `index.ts` | 지금 설정에 맞는 연결부를 골라 줘요. `get_text_provider`, `get_image_provider`, 그리고 "AI 연결하기" 화면용 `create_text_provider_for_key`가 있어요. 사용 횟수 세기도 여기서 붙어요. |
| `gemini_client.ts`, `gemini_text.ts`, `gemini_image.ts`, `gemini_config.ts` | Gemini. `fetch`로 직접 불러요. 모델 이름과 주소 같은 값은 `gemini_config.ts`에 있어요. |
| `claude_text.ts` | Claude 글 연결부. 공식 SDK `@anthropic-ai/sdk`로 불러요. SDK는 Claude 키를 쓸 때만 내려받아요. Claude는 그림을 만들지 않아서 그림 연결부가 없어요. |
| `openai_client.ts`, `openai_text.ts`, `openai_image.ts` | OpenAI. `fetch`로 직접 불러요. `openai_client.ts`가 요청과 오류 변환을, 나머지 둘이 글(`/v1/responses`)과 그림(`/v1/images/generations`)을 맡아요. |
| `strict_schema.ts` | 응답 형식(JSON 스키마)을 Claude와 OpenAI가 받는 엄격한 모양으로 바꿔요. Claude에는 배열 길이 제한을 빼고 보내요. |
| `prompts.ts` | 세 회사가 함께 쓰는 지시문과 응답 읽기 |
| `mock_*.ts` | 연습 모드용 가짜 연결부 |

- 키 한 개가 들어오면 `detect_provider`가 회사를 정하고, `index.ts`가 그 회사의 연결부를 만들어요.
- 글 키와 그림 키는 따로 있어요. 그림 키가 비어 있으면 글 키를 함께 써요. 글 키가 Claude라서 그림을 만들 수 없으면 `get_image_provider`는 `null`을 돌려주고, 화면은 직접 올리기를 안내해요.
- 모든 연결부는 오류를 `ProviderError`로 바꿔 던져요. 그래서 화면은 회사를 몰라도 같은 문구를 보여 줄 수 있어요.
- 검사는 연결부마다 가짜 네트워크로 해요. 가짜 네트워크는 브라우저의 사전 확인(CORS preflight)을 거치지 않아서, 사전 확인에서 막히는 문제는 못 잡아요. 그 부분은 `e2e/live-cors.spec.ts`(키 없이 실제 서버로 보내요)가 봐요. Claude와 OpenAI 모양의 가짜 키로 연결 확인부터 줄거리, 쪽 나누기, 그림까지 보는 검사는 `e2e/multi-provider.spec.ts`예요. 실제 키로 부르는 검사는 `e2e/real-api.spec.ts`이고 평소에는 건너뛰어요.

## AI 연결부 추가하는 법

연결부는 갈아끼울 수 있게 되어 있어요. 새 제공사를 넣는 순서예요.

1. **공식 문서를 먼저 확인해요.** 가격, 무료 한도, 약관의 나이 조건, 오류 코드를 직접 읽어요. 확인하지 못한 제공사는 넣지 않아요.
2. **`docs/PROVIDER_NOTES.md`에 기록해요.** 확인한 날짜, 주소, 원문을 적어요. 문서에서 찾지 못한 것은 "문서에서 찾지 못함"이라고 적어요.
3. **`src/providers/types.ts`의 `TextProvider`와 `ImageProvider`를 구현해요.**
   - `TextProvider`: `id`, `suggestPlots`, `splitIntoPages`, `testConnection`
   - `ImageProvider`: `id`, `model_name`(책의 AI 표시에 쓰여요), `supportsReferenceImage`, `generate`, `testConnection`
4. **`src/providers/provider_kinds.ts`에 회사를 더하고(`ProviderKind`, `PROVIDER_INFO`, 키 앞머리), `src/providers/index.ts`의 `create_text_for_key` / `create_image_for_key`에 갈래를 더해요.** 사용 횟수 세기는 `with_text_usage`, `with_image_usage`가 붙여 줘요.
5. **오류는 `ProviderError`로 바꿔 던져요.** 종류는 `blocked`, `quota_daily`, `rate`, `network`, `bad_key`, `no_permission`, `browser_blocked`(Claude 조직이 브라우저 사용을 꺼 둠), `unknown`이에요. 다시 해 볼 수 있는 시각을 알면 `retry_at`(ms)에 넣어요. 화면 문구는 `error.<kind>` 번역 키로 골라요.
6. 키 확인(`testConnection`)은 `ConnectionResult`를 돌려줘요.
7. 단위 검사를 더해요. 실제 키로 부르는 검사는 넣지 않아요.

참고로 모델 이름과 주소 같은 값은 Gemini는 `gemini_config.ts`에, Claude와 OpenAI는 `provider_kinds.ts`에 모여 있어요. 값이 바뀌면 `PROVIDER_NOTES.md`도 함께 고쳐요.

## 번역 문구 더하는 법

- 화면 문구는 코드에 직접 쓰지 않아요. `src/i18n/ko.json`과 `src/i18n/en.json`에 **같은 키**로 넣어요.
- 키 이름은 `화면.내용` 모양이에요. 예: `connect.check`, `error.rate`
- 값 안의 `{n}`, `{seconds}` 같은 자리 표시는 두 언어에서 같아야 해요.
- 한국어가 원본이에요. 영어는 같은 뜻을 자연스럽게 다시 써요.
- 다 쓴 뒤 `npm run check:i18n`으로 빠진 키가 없는지 확인해요.
- 학생이 보는 문구에는 "프롬프트", "API", "토큰", "모델"을 쓰지 않아요. 쉬운 말로 바꿔 써요. (예: 그림 설명, 키, AI 종류)

## 배포

- GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해서 GitHub Pages에 올려요.
- 배포 주소는 https://storybook.di-lab.io/ 예요. GitHub Pages의 사용자 도메인 설정으로 연결해요.
- `vite.config.ts`의 `base`는 상대 경로(`./`)예요. 글꼴 같은 자원도 상대 경로로 불러서, 도메인의 맨 위(`https://storybook.di-lab.io/`)와 하위 경로(예: `/my-ai-storybook/`) 어디서든 같은 빌드가 동작해요. 미리보기 서버는 맨 위(`/`)에서 열려요(`playwright.config.ts`의 `APP_PATH`).
- 배포가 끝난 뒤에는 주소를 열어 앱 이름이 보이는지 확인해요. 화면이 비어 있다면 `base` 경로를 먼저 의심해요.

## 코드 규칙

- 변수와 함수 이름은 영어 snake_case예요. React 부품은 PascalCase, 훅은 `useXxx`예요.
- 주석은 한국어로 써요.
- 모든 함수 위에 무엇을 하는지 설명하는 주석을 달아요.
- 매직 넘버는 쓰지 않아요. 숫자는 상수로 정해요. 앱 전체의 상수는 `src/constants.ts`에 있어요.
- 화면 문구는 `ko.json`과 `en.json`에 같은 키로 넣어요.
- 학생이 보는 문구에 "프롬프트", "API", "토큰", "모델"을 쓰지 않아요.
- 실제 키를 코드, 검사, 문서 어디에도 넣지 않아요. `npm run check:secrets`가 찾아내요.
- 다른 서비스의 화면, 문구, 그림, 코드를 가져오지 않아요.
- 그림체 이름에는 작가, 회사, 작품 이름을 쓰지 않아요.
- 글꼴은 OFL 라이선스인 것만 써요. 글꼴 파일과 `*-OFL.txt`를 `public/fonts/`에 함께 넣고 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)에 적어요.
- 책 안에는 도구 이름이나 DI Lab 표기를 넣지 않아요.
- 기여하는 방법은 [CONTRIBUTING.md](../CONTRIBUTING.md)를 보세요.
