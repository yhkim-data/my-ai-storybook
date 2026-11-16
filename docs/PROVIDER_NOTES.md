# AI 제공사 조건 확인 기록

- 확인한 날: **2026-11-14**
- 확인한 방법: 아래 공식 문서 주소를 직접 열어 읽었다. `ai.google.dev/gemini-api/...` 주소는 모두 `aistudio.google.com/docs/...`로 넘어간다.
- 실제 키로 글이나 그림을 받아 본 것은 아니다. 이 저장소를 만들 때 키가 없었다. 문서에서 원문을 찾지 못한 항목은 "문서에서 찾지 못함"이라고 적었다.
- 값이 바뀌면 이 문서와 `src/providers/gemini_config.ts`(Gemini), `src/providers/provider_kinds.ts`(Claude, OpenAI)를 함께 고친다.
- 장 구성: 1~7장은 Google Gemini, 8장은 Claude(Anthropic), 9장은 OpenAI, 10장은 세 회사를 견주어 본 표다.
- 세 회사 모두 실제 키로 글이나 그림을 받아 본 적이 없다. 가짜 네트워크 검사 말고, 2026-11-14에 키 값을 빈 문자열로 둔 채 실제 서버에 브라우저에서 요청을 보내는 검사(`e2e/live-cors.spec.ts`)가 생겼다. 이 검사는 요청이 브라우저의 사전 확인(CORS preflight)을 통과하고 서버가 HTTP 상태(예: 401)를 돌려주는 것까지만 본다.

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

### 이 도구에 미치는 영향

- **Gemini는 18세 미만이 쓰는 곳에 연결할 수 없다.** 키는 **만 18세 이상**만 받을 수 있으므로 학생(18세 미만)은 키를 받을 수 없다. 약관은 18세 미만을 대상으로 하거나 18세 미만이 접근할 가능성이 있는 서비스에 Gemini API를 쓰는 것도 금지한다. 그래서 학생이 쓰는 기기와 수업에서는 Gemini 연결을 켜 둘 수 없다.
- Claude와 OpenAI는 금지가 아니라 조건부다. 18세 미만이 쓰게 하려면 키를 받은 어른이나 기관이 그 회사가 정한 보호 조치를 갖춰야 한다. OpenAI는 부모나 법정대리인의 동의도 필요하다(8장, 9장).
- 이 도구는 AI 연결 없이도 책을 끝까지 만들 수 있다(A 방식). 선생님이 자기 기기에서 자기 키로 시연만 하는 것(B 방식)도 있다. 학생이 쓰는 기기에서는 이 두 가지가 기본이다.
- 이 도구가 갖춘 것: AI에 보내는 지시문에 어린이용과 폭력·공포·선정 금지를 고정해 둔다. 회사의 안전 설정을 기본보다 낮추지 않는다. AI 그림이 있으면 책의 "만든 사람" 쪽에 AI 표시가 들어간다. 진짜 이름, 주소, 전화번호를 쓰지 말라는 안내가 있다.
- 이 도구가 갖추지 못한 것: 나이 확인 장치, 지켜보고 신고하는 장치(서버가 없다), 13세 미만 개인정보에 대한 OpenAI의 zero data retention 설정(키를 가진 조직이 OpenAI 쪽에서 해야 한다).
- "AI 연결하기" 화면의 나이 안내(`connect.age_line`)는 이 내용을 짧게 줄인 것이다.

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
- 그림 받기: `"response_format": {"type": "image", "mime_type": "image/png", "aspect_ratio": "1:1", "image_size": "1K"}`. 이미지 생성 문서의 REST 예시에는 아직 `Api-Revision: 2026-05-20` 머리글이 붙어 있다. 하지만 이 도구는 이 머리글을 **보내지 않는다.**
- `Api-Revision` 머리글을 뺀 까닭: Google 서버가 브라우저의 사전 확인(CORS preflight)에서 이 머리글을 거절했다. 같은 주소에 `content-type,x-goog-api-key,api-revision`을 물으면 403이고, `content-type,x-goog-api-key`만 물으면 200과 `Access-Control-Allow-Origin`이 온다(2026-11-14). 머리글을 붙이면 브라우저에서 그림 요청이 "Failed to fetch"로 실패한다.
- 이 머리글은 2026년 5월 Interactions API 응답 모양 변경(`outputs`에서 `steps`로)의 옮겨 가기용 스위치다. 출처: <https://aistudio.google.com/docs/interactions-breaking-changes-may-2026>, <https://aistudio.google.com/docs/changelog>. 원문: "Add the `Api-Revision: 2026-05-20` header to your requests to opt in to the new schema now. After **May 26**, the new schema becomes the default for all requests." 일정표: "June 8: Legacy schema removed for Interactions API. `Api-Revision` header ignored." 그래서 지금은 머리글 없이도 새 모양(`steps`)이 기본이고 머리글은 무시된다. 문서에 "필수"라는 말은 없다.
- 그래서 머리글만 빼고 Interactions API를 그대로 쓴다(`generateContent`로 바꾸지 않았다).
- 참고 그림 넣기: `input` 배열에 `{"type": "image", "mime_type": "image/png", "data": "<base64>"}`
- 응답: `steps[]`에서 `type`이 `model_output`인 것의 `content[]` 안에 `{"type": "text", "text": ...}` 또는 `{"type": "image", "data": <base64>, "mime_type": ...}`
- 저장 끄기: `"store": false` (기본은 저장. 보관 기간은 유료 55일, 무료 1일)
- `temperature` 같은 값은 최신 모델이 무시하고 앞으로 오류가 된다고 해서 보내지 않는다.
- 키 확인: `GET https://generativelanguage.googleapis.com/v1beta/models`. 문서: "only validate that your API key exists ... doesn't guarantee that inference calls ... are enabled." 그래서 "연결됐어요"가 떠도 그림은 결제 연결이 없으면 실패할 수 있다.
- 브라우저에서 직접 부를 수 있는지(CORS)는 문서에서 찾지 못했다. 대신 2026-11-14에 키 없는 실제 브라우저 호출(`e2e/live-cors.spec.ts`)로 세 회사 모두 사전 확인을 통과하고 서버가 HTTP 상태를 돌려주는 것을 확인했다. 실제 키로 그림 응답을 받아 본 것은 아니다. 머리글 없는 요청이 사전 확인을 통과하고 HTTP 상태가 오는 것까지만 확인했다.

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
| `claude-haiku-5-5` | $0.10 | $0.50 | **기본값** (2026-11-14 운영자 지시로 바꿈) |
| `claude-sonnet-5-5` | $2 | $10 | 고를 수 있음 |
| `claude-opus-5-5` | $4 | $20 | 고를 수 있음 |

- 무료 한도는 없다. 돈을 내는 키가 필요하다.
- 그림이 없어서 그림 값은 없다. 그림은 직접 올리면 0원이고, 다른 회사 키로 만들면 그 회사 값이 든다.
- 책 한 권의 글 값(Gemini와 같은 가정: 글 2회, 입력 약 2천 토큰, 출력 약 4천 토큰): 기본값 `claude-haiku-5-5`로 2,000 × $0.10 / 100만 + 4,000 × $0.50 / 100만 = **약 $0.0022 (약 0.2센트)**.

### 부르는 방법

- 공식 SDK `@anthropic-ai/sdk`를 브라우저에서 직접 쓴다(`dangerouslyAllowBrowser`). 서버가 없는 도구라서 각자의 키를 자기 브라우저에서 바로 쓴다. SDK는 Claude 키를 쓸 때만 내려받는다(`claude_text.ts`).
- 요청: `POST https://api.anthropic.com/v1/messages`
- 글을 JSON으로 받기: `output_config.format`(`json_schema`). 배열 길이 제한(`minItems`, `maxItems`)은 받지 않아서 뺐다. 개수는 지시문에 적고, 받은 뒤 다시 확인한다. 모든 object에 `additionalProperties: false`를 붙인다(`strict_schema.ts`).
- 요청이 거절되면 다른 Claude가 이어받는 기능(`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`)을 `claude-opus-5-5`와 `claude-sonnet-5-5`에서 켠다. `claude-haiku-5-5`에서는 켜지 않는다. 기본값이 `claude-haiku-5-5`이므로 **기본값에서는 꺼져 있다.**
- 키 확인: `GET /v1/models`. 글을 만들지 않는다.

### 알려진 막힘

- 조직 설정에 따라 브라우저에서 직접 부르는 것이 막힌 조직이 있다. 이때 응답은 401이고 문구는 "CORS requests are not allowed for this Organization"이다. 코드는 401 문구에 이 말이 있으면 "키가 맞지 않아요" 대신 따로 안내한다(오류 종류 `browser_blocked`). 연결 화면 문구: "키는 맞는 것 같지만, 이 키를 만든 Claude 조직의 설정에서 브라우저 사용이 꺼져 있어요. 조직을 관리하는 사람에게 켜 달라고 하거나 다른 키를 넣어 주세요." 이 말이 없는 401은 지금도 "키가 맞지 않아요"로 보여 준다.

### 나이 조건

출처: <https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors> (쪽에 적힌 날짜 "March 16, 2026", 확인한 날 2026-11-14)

금지가 아니라 조건부다. 원문:

- "organizations providing minors with the ability to directly interact with products that incorporate our API(s) should implement the following safeguards:"
  - "Age verification systems to ensure only intended users can access the product"
  - "Content moderation and filtering to block inappropriate or harmful content"
  - "Monitoring and reporting mechanisms to identify and address potential issues"
  - "Educational resources and guidance for minors on safe and responsible use of the product"
- "It is the responsibility of organizations to comply with all applicable child safety and data privacy regulations, such as the Children's Online Privacy Protection Act (COPPA) in the United States. Compliance with these regulations should be clearly stated on the organization's website or similar public-facing documentation."
- "Organizations must disclose to their users that they are interacting with an AI system rather than a human."
- "Anthropic will periodically audit organizations for compliance with these safeguards." 지키지 않으면 "may lead to the suspension or termination of your account."

이 쪽은 기관용 안내다. 키를 받는 사람의 나이 조건은 이 문서에 없어서 약관을 따로 읽었다(2026-11-14).

- 상업 서비스 약관 <https://www.anthropic.com/legal/commercial-terms>: API 키와 콘솔에 적용된다. **나이 조항이 없다.** 영어판 본문에 "18", "minor"가 나오지 않는다. 원문: "Services under these Terms are not for consumer use."
- 개인용 서비스 약관 <https://www.anthropic.com/legal/consumer-terms> (2025-10-08 시행): Claude.ai 같은 개인용 서비스에 적용된다. 한국어판 원문: "최소 연령. 귀하는 18세 이상 또는 귀하의 지역에서 당사 서비스 이용에 대한 동의에 요구되는 최소 연령 중 더 높은 연령 이상이어야 합니다." 같은 쪽에 API 키와 콘솔은 상업 서비스 약관이 다룬다고 적혀 있다.
- 사용 정책 <https://www.anthropic.com/legal/aup> (2026-11-12 시행): 한국어판 원문: "미성년자 또는 아동은 관할권에 관계없이 18세 미만의 모든 개인으로 정의됩니다." 미성년자에게 제공되는 제품은 위 기관용 안내와 관련 법을 지켜야 한다고 적혀 있다.
- 뒤의 두 쪽은 한국어판으로만 읽혀서 영어 원문은 옮기지 못했다.

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

- 요청: `POST https://api.openai.com/v1/images/generations`. 크기 1024x1024, `quality` medium, `output_format` png, `moderation` auto(`openai_image.ts`).
- 2026-11-14에 다시 확인한 것. 출처: <https://developers.openai.com/api/reference/resources/images/methods/generate>, <https://developers.openai.com/api/docs/guides/image-generation>, <https://developers.openai.com/api/docs/models/gpt-image-2.6-flare> (`-sunburst`도 같은 쪽 모양).
  - `/v1/images/generations`에는 reasoning effort 값이 **없다.** `reasoning.effort`는 `svg` 출력(`svg.reasoning.effort`, `output_format=svg`) 안에만 있다: "Reasoning settings for the SVG author, independent of image complexity."
  - 그림 품질은 `quality`로 정한다(값 `low`, `medium`, `high`, `xhigh`, `max`, `auto`. 기본 `auto`). 2.6 종류에서 `quality`가 폐기되거나 거절된다는 말은 문서에 없다.
  - 따로 `complexity`(`low`, `medium`, `high`)가 있다: "Computation spent planning the image, independently of rendering quality." 안내서: "If you omit `complexity`, both models use `high`." / "Adjusting complexity has no separate fee."
  - 결정: 요청 값은 그대로 두고 `complexity`는 보내지 않아 회사 기본값을 쓴다. 문서에 2.6 종류로 `/images/generations`를 부르는 공식 예시가 없고, 실제 키로 확인하지 못했기 때문이다.
- 모델 쪽 가격: 글 입력 $5, 그림 입력 $8, 그림 출력 $30 (100만 토큰당). 2.6 종류의 그림 한 장 토큰 수와 장당 값은 문서에 없다.
- 그림 값은 장당이 아니라 토큰당이다. 그림 출력 100만 토큰당 $30이다. **장당 값은 문서에 없어서 적지 못했다.** 그래서 OpenAI로 책 한 권을 만드는 비용도 계산하지 못했다.
- 참고 그림은 보내지 않는다(`supportsReferenceImage: false`).

### 한도와 키 확인

- 무료 한도는 문서에 없다.
- 키 확인: `GET /v1/models`. 글이나 그림을 만들지 않는다.
- 오류: 401은 키 문제, 결제가 안 된 코드나 402·403은 "이 키로는 쓸 수 없어요", 429는 잠시 뒤 다시, 안전 때문에 막힌 코드는 "이 내용으로는 만들 수 없어요"로 바꿔 보여 준다(`openai_client.ts`).

### 나이 조건

출처: <https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance> (쪽에 날짜 없음, 확인한 날 2026-11-14)

금지가 아니라 조건부다. 원문:

- "developers should implement additional safeguards when using our API to serve minors (under 18 years old). These are in addition to requirements under our usage policies and terms and conditions."
- "Organizations serving minors must comply with all applicable child protection, safety, and privacy laws, including the Children's Online Privacy Protection Act (COPPA)."
- "You should not use OpenAI services to process any personal data of children under 13 or the applicable age of digital consent without first implementing zero data retention in our API."
- "Organizations serving minors must take reasonable steps to ensure that the content they are serving to minors via the API is safe and age appropriate"
- 조치 목록:
  - "Providing age-appropriate disclosures to minors about AI tools and how to use them responsibly."
  - "Implementing age-appropriate content filters to address potentially sensitive content."
  - "Implementing reasonable monitoring and reporting mechanisms, including escalation paths for high-risk interactions."
  - "Where required or otherwise appropriate for your use case, using age assurance systems to ensure only intended users can access the product."
- "OpenAI reserves the right to audit organizations for compliance with this policy."

**OpenAI 약관의 나이 조항.** 자동 도구로는 HTTP 403이 나서, 사람이 브라우저로 2026-11-14에 한국어판을 읽었다. **영어 원문은 확인하지 못했다.**

- 서비스 계약 <https://openai.com/ko-KR/policies/services-agreement/> (업데이트 2025-12-01, API에 적용): 고객 금지 행위 (c) "부모 또는 법정대리인의 동의 없이 미성년자가 OpenAI 서비스를 사용하도록 허용하는 행위".
- 이용약관(개인용) <https://openai.com/ko-KR/policies/row-terms-of-use/>: 최소 만 13세 또는 그 나라가 정한 나이 이상이어야 하고, 18세 미만은 부모나 법정대리인의 허가가 필요하다.
- 이용정책 <https://openai.com/ko-KR/policies/usage-policies/> (2026-11-20 시행판): 아동·청소년 보호 조항이 있다. 미성년자에게 나이에 맞지 않는 콘텐츠를 보여 주는 것 등을 금지한다.
- 서비스 약관 <https://openai.com/ko-KR/policies/service-terms/> (업데이트 2026-11-13): 나이 조항이 없다.
- 이 도구에 미치는 영향: API 키로 학생이 쓰게 하려면 위 보호 조치에 더해 **부모나 법정대리인의 동의**가 필요하다. 서비스 계약에는 미성년자의 나이 정의가 없으므로, 한국에서는 민법상 성년 기준인 만 19세 미만을 미성년자로 보는 것이 안전하다.

## 10. 세 회사 한눈에 보기

| | Google Gemini | Claude | OpenAI |
|---|---|---|---|
| 글 | 됨 | 됨 | 됨 |
| 그림 | 됨 | 안 됨 | 됨 |
| 글 기본 모델 | `gemini-3.5-flash-lite` | `claude-haiku-5-5` | `gpt-6-luna` |
| 그림 기본 모델 | `gemini-3.1-flash-lite-image` | 없음 | `gpt-image-2.6-flare` |
| 무료 한도 | 글만 있음 | 없음 | 문서에 없음 |
| 그림 1장 값 | $0.0336 | 해당 없음 | 문서에 없음 |
| 부르는 법 | `fetch` | 공식 SDK | `fetch` |
| 나이 조건 | 키는 18세 이상. 18세 미만이 쓰는 서비스에는 연결할 수 없음 (약관 확인함) | 조건부: 18세 미만이 쓰게 하려면 기관이 보호 조치를 갖춰야 함 (기관 안내 확인함). 키에 적용되는 상업 약관에는 나이 조항 없음 (약관 확인함) | 조건부: 18세 미만에게 쓰게 하려면 보호 조치와 보호자 동의가 필요함 (안내와 서비스 계약 한국어판 확인함) |
