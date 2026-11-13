# 개발 문서

이 문서는 "나만의 AI 동화책" 코드를 읽고 고치려는 개발자를 위한 글이에요. 사용자용 문서는 [README](../README.md)에 있어요.

## 폴더 구조

| 폴더 / 파일 | 하는 일 |
|---|---|
| `src/App.tsx`, `src/main.tsx` | 앱의 시작점과 화면 고르기 |
| `src/screens/` | 화면 하나가 파일 하나예요. 시작, AI 연결하기, 이야기 씨앗, 줄거리, 쪽 나누기, 그림체, 그림, 꾸미기, 완성, 권리 안내. 화면마다 CSS와 검사 파일이 있어요. |
| `src/components/` | 여러 화면이 함께 쓰는 부품 (`Shell`, `PageView`, `Notice`) |
| `src/editor/` | 꾸미기 화면의 글상자 편집 (`EditableTextBox.tsx`, 자리 계산 `geometry.ts`) |
| `src/providers/` | AI 연결부. 글, 그림, 가짜(연습용) 연결부와 오류 흉내가 있어요. |
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

- `npm run dev`는 개발 서버를 열어요. 주소는 터미널에 나와요. 앱은 `vite.config.ts`의 `base`(`/my-ai-storybook/`) 아래에 놓여요.
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
| `npm run screenshots` | 화면 사진을 찍어 `docs/images/`에 넣어요. |

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
- 키와 설정, 오늘 쓴 횟수: localStorage (`storybook.settings`, `storybook.usage`)
- 서버는 없어요.

## AI 연결부 추가하는 법

연결부는 갈아끼울 수 있게 되어 있어요. 새 제공사를 넣는 순서예요.

1. **공식 문서를 먼저 확인해요.** 가격, 무료 한도, 약관의 나이 조건, 오류 코드를 직접 읽어요. 확인하지 못한 제공사는 넣지 않아요.
2. **`docs/PROVIDER_NOTES.md`에 기록해요.** 확인한 날짜, 주소, 원문을 적어요. 문서에서 찾지 못한 것은 "문서에서 찾지 못함"이라고 적어요.
3. **`src/providers/types.ts`의 `TextProvider`와 `ImageProvider`를 구현해요.**
   - `TextProvider`: `id`, `suggestPlots`, `splitIntoPages`, `testConnection`
   - `ImageProvider`: `id`, `model_name`(책의 AI 표시에 쓰여요), `supportsReferenceImage`, `generate`, `testConnection`
4. **`src/providers/index.ts`의 `get_text_provider` / `get_image_provider`에 갈래를 더해요.** 사용 횟수 세기는 `with_text_usage`, `with_image_usage`가 붙여 줘요.
5. **오류는 `ProviderError`로 바꿔 던져요.** 종류는 `blocked`, `quota_daily`, `rate`, `network`, `bad_key`, `no_permission`, `unknown`이에요. 다시 해 볼 수 있는 시각을 알면 `retry_at`(ms)에 넣어요. 화면 문구는 `error.<kind>` 번역 키로 골라요.
6. 키 확인(`testConnection`)은 `ConnectionResult`를 돌려줘요.
7. 단위 검사를 더해요. 실제 키로 부르는 검사는 넣지 않아요.

참고로 지금의 Gemini 연결부는 `gemini_client.ts`, `gemini_text.ts`, `gemini_image.ts`, `gemini_config.ts`에 있어요. 모델 이름과 주소 같은 값은 `gemini_config.ts`에 모여 있고, 값이 바뀌면 `PROVIDER_NOTES.md`도 함께 고쳐요.

## 번역 문구 더하는 법

- 화면 문구는 코드에 직접 쓰지 않아요. `src/i18n/ko.json`과 `src/i18n/en.json`에 **같은 키**로 넣어요.
- 키 이름은 `화면.내용` 모양이에요. 예: `connect.check`, `error.rate`
- 값 안의 `{n}`, `{seconds}` 같은 자리 표시는 두 언어에서 같아야 해요.
- 한국어가 원본이에요. 영어는 같은 뜻을 자연스럽게 다시 써요.
- 다 쓴 뒤 `npm run check:i18n`으로 빠진 키가 없는지 확인해요.
- 학생이 보는 문구에는 "프롬프트", "API", "토큰", "모델"을 쓰지 않아요. 쉬운 말로 바꿔 써요. (예: 그림 설명, 키, AI 종류)

## 배포

- GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해서 GitHub Pages에 올려요.
- 배포 주소는 https://di-lab.io/my-ai-storybook/ 예요.
- 앱이 놓이는 경로는 `vite.config.ts`의 `base`(`/my-ai-storybook/`)예요. 저장소 이름을 바꾸면 `base`와 `playwright.config.ts`의 `APP_PATH`도 함께 바꿔요.
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
