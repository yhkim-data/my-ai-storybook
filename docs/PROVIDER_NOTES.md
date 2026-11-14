# AI 제공사 조건 확인 기록

- 확인한 날: **2026-11-14**
- 확인한 방법: 아래 공식 문서 주소를 직접 열어 읽었다. `ai.google.dev/gemini-api/...` 주소는 모두 `aistudio.google.com/docs/...`로 넘어간다.
- 실제 키로 호출해 본 것은 아니다. 이 저장소를 만들 때 키가 없었다. 문서에서 원문을 찾지 못한 항목은 "문서에서 찾지 못함"이라고 적었다.
- 값이 바뀌면 이 문서와 `src/providers/gemini_config.ts`(Gemini), `src/providers/provider_kinds.ts`(Claude, OpenAI)를 함께 고친다.
- 장 구성: 1~7장은 Google Gemini, 8장은 Claude(Anthropic), 9장은 OpenAI, 10장은 세 회사를 견주어 본 표다.
- 세 회사 모두 실제 키로 호출해 본 적이 없다. 가짜 네트워크로만 검사했다.

## 1. 쓰는 제공사

세 회사의 키를 받는다. Google Gemini, Claude(Anthropic), OpenAI다. 이 도구는 키 앞머리로 회사를 알아본다(`src/providers/provider_kinds.ts`의 `detect_provider`).

| 키 앞머리 | 회사 |
|---|---|
| `sk-ant-` | Claude |
| `sk-` (위가 아닌 것) | OpenAI |
| 그 밖 | Google Gemini |

- `sk-ant-`도 `sk-`로 시작하므로 긴 앞머리부터 견준다.
- 2장부터 7장은 Gemini 기록이다. Claude는 8장, OpenAI는 9장에 있다.

## 2. 약관

출처: <https://aistudio.google.com/docs/terms> (Gemini API Additional Terms of Service, "Effective March 23, 2026")

| 항목 | 확인한 내용 (원문) |
|---|---|
| 나이 | "You must be 18 years of age or older to use the APIs." |
| 18세 미만 대상 서비스 | "You also will not use the Services as part of a website, application, or other service (collectively, "API Clients") that is directed towards or is likely to be accessed by individuals under the age of 18." **이 조항은 현재 판에 남아 있다.** |
| 무료 사용 시 데이터 | "Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services and machine learning technologies..." / "human reviewers may read, annotate, and process your API input and output." / "Do not submit sensitive, confidential, or personal information to the Unpaid Services." |
| 유료 사용 시 데이터 | "Google doesn't use your prompts (...) or responses to improve our products..." (다만 악용 탐지를 위해 한동안 기록은 남긴다) |
| 결과물 소유 | "Some of our Services allow you to generate original content. Google won't claim ownership over that content." |
| 유럽 | "You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom." |
| 한국 | 사용 가능 지역 목록에 "South Korea"가 있다. 출처: <https://aistudio.google.com/docs/available-regions> |

### 이 도구에 미치는 영향 (쓰는 사람이 정한다)

수업에서 AI 연결을 쓸지는 **쓰는 사람(교사·운영자)이 자유롭게 정한다.** 정할 때 볼 조건은 아래와 같다.

- Gemini 키는 **만 18세 이상**만 받을 수 있다. 학생이 자기 키를 받는 것은 약관에 맞지 않는다.
- Gemini 약관은 18세 미만을 대상으로 하거나 18세 미만이 쓸 가능성이 있는 서비스에 Gemini API를 붙이는 것도 막고 있다. AI 연결을 켠 채로 학생이 쓰는 것은 이 조항에 걸릴 수 있다.
- Claude와 OpenAI의 나이 조건은 이번에 약관 원문을 확인하지 못했다. 각 회사 약관을 확인해야 한다.
- 이 도구는 AI 연결 없이도 책을 끝까지 만들 수 있다. 연결을 쓰지 않는 길이 늘 열려 있다.
- "AI 연결하기" 화면에는 회사마다 나이 조건이 있고 키를 받은 사람이 그 회사 약관을 지켜야 한다는 안내가 있다.

## 3. 키

출처: <https://aistudio.google.com/docs/api-key>, <https://aistudio.google.com/docs/troubleshooting>, <https://developers.google.com/terms>

- 키 받는 곳: <https://aistudio.google.com/apikey> ("Create API key" 단추)
- 키는 `x-goog-api-key` 머리글로 보낸다.
- 문서의 경고: "Never expose keys client-side in production: Do not hardcode API keys directly in web or mobile apps." / "Never embed API keys directly in client-side code or public repositories." / Google APIs 약관 4b: "Developer credentials may not be embedded in open source projects."
- 이 도구는 키를 코드에 넣지 않는다. 쓰는 사람이 자기 키를 자기 브라우저에 넣고, 그 브라우저의 localStorage에만 둔다. 그래도 같은 기기를 쓰는 다른 사람이 키를 볼 수 있으므로 "이 기기에서 키 지우기" 단추와 안내를 두었다.
- 한도는 키가 아니라 프로젝트 단위로 걸린다: "Rate limits are applied per project, not per API key."

## 4. 모델과 가격

출처: <https://aistudio.google.com/docs/models>, <https://aistudio.google.com/docs/pricing>

### 글

| 모델 ID | 상태 | 무료 한도 | 유료 가격 (100만 토큰당) |
|---|---|---|---|
| `gemini-3.5-flash-lite` (**기본값**) | Stable | 있음 ("Free of charge") | 입력 $0.30, 출력 $2.50 |
| `gemini-3.8-flash` | Stable | 있음 ("Free of charge") | 입력 $0.75, 출력 $3.75 (2026-12-31까지. 2027-01-01부터 $1.50 / $7.50) |

- 무료 한도의 분당·하루 횟수는 **문서에서 찾지 못했다.** 한도 문서는 숫자를 싣지 않고 AI Studio에서 보라고 한다: <https://aistudio.google.com/rate-limit> (로그인 필요). 지시서의 참고값(일반 Flash 하루 20회 안팎, 경량 하루 500회 안팎)은 공식 문서로 확인하지 못했다.
- 하루 한도는 태평양 시간 자정에 풀린다: "Requests per day (RPD) quotas reset at midnight Pacific time."
- 무료로 쓰면 내용이 제품 개선에 쓰인다 (가격표의 "Used to improve our products": Free "Yes", Paid "No").

### 그림

| 모델 ID | 상태 | 무료 한도 | 1장 가격 (1K, 1024×1024) |
|---|---|---|---|
| `gemini-3.1-flash-lite-image` (**기본값**) | Stable | **없음** ("Not available") | $0.0336 |
| `gemini-nano-banana-2.1` | New | **없음** ("Not available") | $0.0336 (2K $0.0504, 4K $0.113) |
| `gemini-3.1-flash-image` | Stable | **없음** ("Not available") | $0.067 (0.5K $0.045) |

- 그림 모델은 모두 무료 한도가 없다. **결제를 연결한 키가 있어야 그림을 만들 수 있다.**
- 참고 그림 입력: `gemini-nano-banana-2.1`과 `gemini-3.1-flash-image`는 문서에 참고 그림 예시와 장수 표가 있다. `gemini-3.1-flash-lite-image`는 "Not optimized for multiple reference inputs or multi-turn sequential editing."이라고만 되어 있어 지원한다고 확인하지 못했다. 그래서 기본 모델에서는 참고 그림을 보내지 않고, 위 두 모델을 골랐을 때만 첫 그림을 참고로 보낸다.
- 만든 그림에는 워터마크가 들어간다: "All generated images include a SynthID watermark." 출처: <https://aistudio.google.com/docs/image-generation>

### 책 한 권 비용 계산 (2026-11-14 가격)

- 그림 9장(표지 1 + 본문 8) × $0.0336 = **$0.3024**
- 글 2회(줄거리 제안, 쪽 나누기): 무료 한도 안에서는 $0. 유료로 내도 입력 약 2천 토큰, 출력 약 4천 토큰으로 잡으면 약 $0.011.
- 합계: **책 한 권에 약 0.31달러.** 그림을 다시 만들면 한 장에 $0.0336씩 더 든다.
- 글만 AI로 쓰고 그림은 올리면 무료 한도 안에서 0원이다.

## 5. 부르는 방법

출처: <https://aistudio.google.com/docs/interactions>, <https://aistudio.google.com/api-reference/interactions-api>, <https://aistudio.google.com/docs/structured-output>, <https://aistudio.google.com/docs/image-generation>

- 주소: `POST https://generativelanguage.googleapis.com/v1beta/interactions` (Interactions API). 예전 `generateContent`는 "legacy"지만 "remains fully supported"라고 되어 있다. 새로 만드는 것이라 Interactions API를 쓴다.
- 글을 JSON으로 받기: `"response_format": {"type": "text", "mime_type": "application/json", "schema": {...}}`
- 그림 받기: `"response_format": {"type": "image", "mime_type": "image/png", "aspect_ratio": "1:1", "image_size": "1K"}`. 그림 예시에는 `Api-Revision: 2026-05-20` 머리글이 붙어 있다.
- 참고 그림 넣기: `input` 배열에 `{"type": "image", "mime_type": "image/png", "data": "<base64>"}`
- 응답: `steps[]`에서 `type`이 `model_output`인 것의 `content[]` 안에 `{"type": "text", "text": ...}` 또는 `{"type": "image", "data": <base64>, "mime_type": ...}`
- 저장 끄기: `"store": false` (기본은 저장. 보관 기간은 유료 55일, 무료 1일)
- `temperature` 같은 값은 최신 모델이 무시하고 앞으로 오류가 된다고 해서 보내지 않는다.
- 키 확인: `GET https://generativelanguage.googleapis.com/v1beta/models`. 문서: "only validate that your API key exists ... doesn't guarantee that inference calls ... are enabled." 그래서 "연결됐어요"가 떠도 그림은 결제 연결이 없으면 실패할 수 있다.
- 브라우저에서 직접 부를 수 있는지(CORS)는 문서에서 찾지 못했다. 실제 키로 확인이 필요하다.

## 6. 안전 설정

출처: <https://aistudio.google.com/docs/safety-settings>

- 기본값: "Categories you don't set use the default threshold, which is **Off** for Gemini 2.5 and later models."
- 이 도구는 기본값보다 **엄격하게** 보낸다: `harassment`, `hate_speech`, `sexually_explicit`, `dangerous_content` 네 가지 모두 `block_low_and_above`.
- 그림 모델이 `safety_settings`를 받는지는 문서에서 명시한 곳을 찾지 못했다. 그림 요청이 이 값 때문에 거절되면(오류 문구에 `safety_settings`가 들어 있을 때만) 이 값을 빼고 한 번 다시 보낸다. 이때는 제공사 기본값이 적용되며 기본값보다 낮추는 것은 아니다.
- 막혔을 때: HTTP 400과 `{"error": {"code": "safety", ...}}`. 입력이 막힌 경우 `jailbreak`, `prohibited_content`, `blocklist`. 그림은 `image_safety`, `image_prohibited_content`, `image_recitation`, `image_other`, `content_blocked`, `no_image`.

## 7. 오류 코드

출처: <https://aistudio.google.com/docs/api-errors>, <https://aistudio.google.com/docs/troubleshooting>

| HTTP | code | 이 도구의 안내 |
|---|---|---|
| 401 | `authentication` | 키가 맞지 않아요 |
| 402, 403 | `payment_required`, `permission_denied` | 이 키로는 쓸 수 없어요 (그림은 결제 연결 필요) |
| 429 | `quota_exceeded` | 오늘 쓸 수 있는 횟수를 다 썼어요 (태평양 시간 자정에 풀림) |
| 429 | `rate_limit_exceeded`, `too_many_requests` | 조금 뒤에 다시 해 볼게요 (1분 뒤) |
| 400 | `safety` 등 | 이 내용으로는 만들 수 없어요 |

- 다시 시도할 시간을 알려 주는 응답 필드나 `Retry-After` 머리글은 문서에서 찾지 못했다. 분당 한도는 60초 뒤, 하루 한도는 태평양 시간 자정으로 계산해서 보여 준다.

## 8. Claude (Anthropic)

확인한 날: 2026-11-14. 공식 문서에서 확인한 것만 적었다. 이 밖의 숫자는 적지 않는다.

### 하는 일

- **글만 만든다. 그림은 만들지 않는다.**
- Claude 키만 있으면 그림은 직접 올리거나, "자세한 설정"에서 그림용 키(Gemini나 OpenAI)를 따로 넣는다. 코드에서는 `provider_kinds.ts`의 Claude 설정에 `image_model: null`이다.
- 키 받는 곳: <https://platform.claude.com/settings/keys>

### 모델과 가격 (100만 토큰당)

| 모델 ID | 입력 | 출력 | 이 도구에서 |
|---|---|---|---|
| `claude-opus-5-5` | $4 | $20 | **기본값** |
| `claude-sonnet-5-5` | $2 | $10 | 고를 수 있음 |
| `claude-haiku-5-5` | $0.10 | $0.50 | 고를 수 있음 |

- 무료 한도는 없다. 돈을 내는 키가 필요하다.
- 그림이 없어서 그림 값은 없다.

### 부르는 방법

- 공식 SDK `@anthropic-ai/sdk`를 브라우저에서 직접 쓴다(`dangerouslyAllowBrowser`). 서버가 없는 도구라서 각자의 키를 자기 브라우저에서 바로 쓴다. SDK는 Claude 키를 쓸 때만 내려받는다(`claude_text.ts`).
- 요청: `POST https://api.anthropic.com/v1/messages`
- 글을 JSON으로 받기: `output_config.format`(`json_schema`). 배열 길이 제한(`minItems`, `maxItems`)은 받지 않아서 뺐다. 개수는 지시문에 적고, 받은 뒤 다시 확인한다. 모든 object에 `additionalProperties: false`를 붙인다(`strict_schema.ts`).
- 요청이 거절되면 다른 Claude가 이어받는 기능(`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`)을 `claude-opus-5-5`와 `claude-sonnet-5-5`에서 켠다. `claude-haiku-5-5`에서는 켜지 않는다.
- 키 확인: `GET /v1/models`. 글을 만들지 않는다.

### 알려진 막힘

- 조직 설정에 따라 브라우저에서 직접 부르는 것이 막힌 조직이 있다. 이때 응답은 401이고 문구는 "CORS requests are not allowed for this Organization"이다. 코드는 401을 "키가 맞지 않아요"로 보여 준다. 키 문제가 아니라 조직 설정 문제일 수 있다.

### 나이 조건

- 이번에 약관 원문을 확인하지 못했다. 각 회사 약관을 확인해야 한다.

## 9. OpenAI

확인한 날: 2026-11-14. 공식 문서에서 확인한 것만 적었다. 이 밖의 숫자는 적지 않는다.

- 키 받는 곳: <https://platform.openai.com/api-keys>
- 키는 `Authorization: Bearer` 머리글로 보낸다. 공식 SDK는 쓰지 않고 `fetch`로 직접 부른다(`openai_client.ts`).

### 글

| 모델 ID | 입력 | 출력 (100만 토큰당) | 이 도구에서 |
|---|---|---|---|
| `gpt-6-luna` | $0.10 | $0.50 | **기본값** |
| `gpt-6.1-terra` | $1 | $5 | 고를 수 있음 |
| `gpt-6.1-sol` | $2 | $10 | 고를 수 있음 |

- 요청: `POST https://api.openai.com/v1/responses`. `text.format`은 `json_schema`이고 `strict: true`, `store: false`로 보낸다(`openai_text.ts`).

### 그림

| 모델 ID | 이 도구에서 |
|---|---|
| `gpt-image-2.6-flare` | **기본값** |
| `gpt-image-2.6-sunburst` | 고를 수 있음 |

- 요청: `POST https://api.openai.com/v1/images/generations`. 크기 1024x1024, `quality` medium, `moderation` auto(`openai_image.ts`).
- 그림 값은 장당이 아니라 토큰당이다. 그림 출력 100만 토큰당 $30이다. **장당 값은 문서에 없어서 적지 못했다.** 그래서 OpenAI로 책 한 권을 만드는 비용도 계산하지 못했다.
- 참고 그림은 보내지 않는다(`supportsReferenceImage: false`).

### 한도와 키 확인

- 무료 한도는 문서에 없다.
- 키 확인: `GET /v1/models`. 글이나 그림을 만들지 않는다.
- 오류: 401은 키 문제, 결제가 안 된 코드나 402·403은 "이 키로는 쓸 수 없어요", 429는 잠시 뒤 다시, 안전 때문에 막힌 코드는 "이 내용으로는 만들 수 없어요"로 바꿔 보여 준다(`openai_client.ts`).

### 나이 조건

- 이번에 약관 원문을 확인하지 못했다. 각 회사 약관을 확인해야 한다.

## 10. 세 회사 한눈에 보기

| | Google Gemini | Claude | OpenAI |
|---|---|---|---|
| 글 | 됨 | 됨 | 됨 |
| 그림 | 됨 | 안 됨 | 됨 |
| 글 기본 모델 | `gemini-3.5-flash-lite` | `claude-opus-5-5` | `gpt-6-luna` |
| 그림 기본 모델 | `gemini-3.1-flash-lite-image` | 없음 | `gpt-image-2.6-flare` |
| 무료 한도 | 글만 있음 | 없음 | 문서에 없음 |
| 그림 1장 값 | $0.0336 | 해당 없음 | 문서에 없음 |
| 부르는 법 | `fetch` | 공식 SDK | `fetch` |
| 나이 조건 | 18세 이상 (약관 확인함) | 약관 확인 못 함 | 약관 확인 못 함 |
