# 선생님 안내서

[English](teacher-guide.en.md) | **한국어**

이 안내서는 "나만의 AI 동화책"으로 수업을 하려는 선생님을 위한 글이에요. 바로 써보기: https://di-lab.io/my-ai-storybook/

## 수업 준비물

- 인터넷에 연결된 컴퓨터, 태블릿, 또는 휴대폰 (학생 한 명에 한 대)
- 요즘 브라우저 (Chrome, Edge, Safari 등)
- 설치, 회원가입, 비용은 필요 없어요. (AI를 연결해서 쓸 때만 돈이 들 수 있어요.)
- 직접 그린 그림을 올릴 거라면 종이, 색연필, 그리고 그림을 사진으로 찍을 기기
- 책을 인쇄할 거라면 인쇄를 맡길 곳

## 수업 전에 정할 것

### 1. AI를 연결할 것인가

이 도구는 Google Gemini, Claude, OpenAI 키를 쓸 수 있어요. 회사마다 조건이 달라요. 학생(18세 미만)이 쓰는 수업이라면 아래 조건을 먼저 읽어 보세요. 이 도구는 AI 연결 없이도 책을 끝까지 만들 수 있어요.

**Google Gemini: 학생이 쓰는 기기에서는 연결할 수 없어요.** 아래는 Google의 Gemini API 약관(2026-03-23 시행판)에서 2026-11-14에 확인한 내용이에요.

- 나이: "You must be 18 years of age or older to use the APIs." 키는 만 18세 이상만 받을 수 있어요.
- 18세 미만 대상 서비스: "You also will not use the Services as part of a website, application, or other service (collectively, "API Clients") that is directed towards or is likely to be accessed by individuals under the age of 18." 이 조항은 현재 판에 남아 있어요.

이 말은 이렇게 읽어요.

- 학생은 Gemini 키를 받을 수 없어요.
- 학생이 쓰는 기기와 수업에서는 Gemini 연결을 켜 둘 수 없어요.
- 선생님이 자기 기기에서 자기 키로 시연만 하는 것(아래 B 방식)과 AI 연결 없이 쓰는 것(아래 A 방식)은 그대로 할 수 있어요.

**Claude (Anthropic): 조건을 갖추면 18세 미만이 쓸 수 있어요.** 아래는 Anthropic의 기관용 안내(쪽에 적힌 날짜 2026-03-16)에서 2026-11-14에 확인한 내용이에요. 출처: https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors

- "organizations providing minors with the ability to directly interact with products that incorporate our API(s) should implement the following safeguards:"
  - "Age verification systems to ensure only intended users can access the product"
  - "Content moderation and filtering to block inappropriate or harmful content"
  - "Monitoring and reporting mechanisms to identify and address potential issues"
  - "Educational resources and guidance for minors on safe and responsible use of the product"
- "It is the responsibility of organizations to comply with all applicable child safety and data privacy regulations, such as the Children's Online Privacy Protection Act (COPPA) in the United States. Compliance with these regulations should be clearly stated on the organization's website or similar public-facing documentation."
- "Organizations must disclose to their users that they are interacting with an AI system rather than a human."
- "Anthropic will periodically audit organizations for compliance with these safeguards." 지키지 않으면 "may lead to the suspension or termination of your account."
- 이 쪽은 기관용 안내예요. 키를 받는 사람의 나이: 키와 콘솔에 적용되는 Anthropic 상업 서비스 약관(Commercial Terms of Service)에는 나이 조항이 없어요(2026-11-14 확인). 18세 이상 조건은 Claude.ai 같은 개인용 서비스 약관(Consumer Terms, 2025-10-08 시행)에 있어요.

**OpenAI: 조건을 갖추면 18세 미만이 쓸 수 있어요.** 아래는 OpenAI의 18세 미만 API 안내(쪽에 날짜 없음)에서 2026-11-14에 확인한 내용이에요. 출처: https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance

- "developers should implement additional safeguards when using our API to serve minors (under 18 years old). These are in addition to requirements under our usage policies and terms and conditions."
- "Organizations serving minors must comply with all applicable child protection, safety, and privacy laws, including the Children's Online Privacy Protection Act (COPPA)."
- "You should not use OpenAI services to process any personal data of children under 13 or the applicable age of digital consent without first implementing zero data retention in our API."
- "Organizations serving minors must take reasonable steps to ensure that the content they are serving to minors via the API is safe and age appropriate"
- 조치: "Providing age-appropriate disclosures to minors about AI tools and how to use them responsibly." / "Implementing age-appropriate content filters to address potentially sensitive content." / "Implementing reasonable monitoring and reporting mechanisms, including escalation paths for high-risk interactions." / "Where required or otherwise appropriate for your use case, using age assurance systems to ensure only intended users can access the product."
- "OpenAI reserves the right to audit organizations for compliance with this policy."
- **OpenAI 서비스 약관의 나이 조항은 확인하지 못했어요.** 약관 주소 세 곳이 자동으로 읽으려 하면 HTTP 403으로 막혔어요(2026-11-14). 쓰기 전에 사람이 브라우저로 직접 열어 읽어야 해요: https://openai.com/policies/terms-of-use/ , https://openai.com/policies/services-agreement/ , https://openai.com/policies/usage-policies/

**이 도구가 갖춘 것과 갖추지 못한 것.**

- 갖춘 것: AI에 보내는 지시문에 어린이용이고 폭력, 공포, 선정적인 내용을 쓰지 않는다는 규칙을 고정해 뒀어요. 회사의 안전 설정을 기본보다 낮추지 않아요. AI 그림이 있으면 책의 "만든 사람" 쪽에 AI 표시가 들어가요. 진짜 이름, 주소, 전화번호를 쓰지 말라는 안내가 있어요.
- 갖추지 못한 것: 나이 확인 장치, 지켜보고 신고하는 장치(이 도구에는 서버가 없어요), 13세 미만의 개인정보에 대한 OpenAI의 zero data retention 설정(키를 가진 조직이 OpenAI 쪽에서 해야 해요).
- 그래서 Claude나 OpenAI를 학생이 쓰게 하려면, **키를 받은 어른이나 기관(학교)이 위 조치를 갖추고 책임져야 해요.** 갖추지 못했다면 A 방식(AI 연결 없이)이나 B 방식(선생님 시연)을 쓰세요.
- Claude는 글만 만들어요. 그림은 직접 올리거나 다른 회사의 그림용 키를 따로 넣어요.
- 이 안내서는 법률 조언이 아니에요.

### 2. 세 가지 방법 중 고르기

| 방법 | 학생 기기에서 하는 일 | AI 연결 | 비용 |
|---|---|---|---|
| A. AI 연결 없이 | 글을 직접 쓰고, 그림을 직접 그려서 올려요. | 없음 | 0원 |
| B. 선생님 키로 시연만 | 선생님 기기에서 선생님의 키로 AI가 어떻게 만드는지 화면으로 보여 줘요. 학생은 따라 하지 않아요. | 선생님 기기만 | 아래 비용 계산 |
| C. 그림 설명 복사 방식 | 학생이 [그림 설명 복사]를 눌러 다른 AI 앱에 붙여넣어요. | 이 도구에는 없음 | 다른 앱의 조건을 따라요 |

- C 방식에서도 학생이 쓰는 다른 AI 앱의 나이 조건은 따로 확인해야 해요. 이 도구는 그 앱의 조건을 알지 못해요.
- 키가 없어도 연습하려면 주소 끝에 `?mock=1`을 붙여요. 미리 준비된 예시 이야기와 그림으로 AI 단계를 눌러 볼 수 있어요. 키를 쓰지 않아서 시연에 좋아요.
- 선생님이 시연한 뒤에는 함께 쓰는 기기라면 [AI 연결하기] 화면에서 [이 기기에서 키 지우기]를 눌러 주세요.

### 3. 인쇄할 것인가

인쇄할 거라면 아래 "인쇄 맡기는 법"을 먼저 읽어 두세요.

## 2차시 진행 순서 예시

한 차시를 40분으로 잡은 예시예요. 학교 상황에 맞게 바꿔 쓰세요.

### 1차시: 이야기 만들기

| 시간 | 단계 | 하는 일 |
|---|---|---|
| 5분 | 시작 | 주소를 열고 [체험판 보기]로 다 만든 책을 넘겨 봐요. |
| 10분 | 이야기 씨앗 | 읽을 사람, 주제, 주인공 이름과 모습, 쪽수를 정해요. 진짜 이름은 쓰지 않아요. |
| 10분 | 줄거리 | 제목과 줄거리를 써요. (AI 없이는 [내가 직접 쓸게요]) |
| 15분 | 쪽 나누기 | 쪽마다 글을 쓰고, 그림 설명도 써 봐요. 그림 설명은 비워 둬도 돼요. |

### 2차시: 그림, 꾸미기, 발표

| 시간 | 단계 | 하는 일 |
|---|---|---|
| 5분 | 그림체 | 그림체를 골라요. 내 그림을 올릴 거라면 아무거나 골라도 돼요. |
| 15분 | 그림 | 쪽마다 [내 그림 올리기]로 그림을 올려요. 그림이 없는 쪽이 있어도 다음으로 갈 수 있어요. |
| 10분 | 꾸미기 | 글을 고치고, 글상자를 옮기고, 글꼴과 색을 골라요. 표지의 글이 책 제목이에요. |
| 10분 | 완성과 발표 | 지은이 이름을 쓰고 책을 넘겨 보며 발표해요. PDF나 작업 파일을 받아요. |

- 그림을 직접 그리는 수업이라면 1차시와 2차시 사이에 그림 그리는 시간을 따로 두세요.
- 만들던 책은 이 기기의 브라우저에 자동 저장돼요. 하지만 기기가 바뀌거나 브라우저 데이터를 지우면 사라져요. 수업이 끝나면 [작업 파일 받기]로 파일을 받아 두세요. 다음 시간에 시작 화면의 [파일 불러오기]로 열 수 있어요.
- 새 책을 시작하면 만들던 책이 지워져요. 화면에 확인 창이 떠요.

## 비용 계산

AI 연결 없이 쓰면 0원이에요. 회사마다 값이 달라요. 가격은 2026-11-14에 각 회사의 공식 문서에서 확인했어요. 자세한 기록은 [PROVIDER_NOTES](PROVIDER_NOTES.md)에 있어요.

| 회사 | 글 | 그림 | 무료 한도 |
|---|---|---|---|
| Google Gemini | 기본 `gemini-3.5-flash-lite`: 입력 $0.30, 출력 $2.50 (100만 토큰당) | 한 장 $0.0336 | 글에만 있어요 |
| Claude | 기본 `claude-haiku-5-5`: 입력 $0.10, 출력 $0.50 (`claude-sonnet-5-5` $2 / $10, `claude-opus-5-5` $4 / $20) | 만들지 않아요 | 없어요 |
| OpenAI | 기본 `gpt-6-luna`: 입력 $0.10, 출력 $0.50 (`gpt-6.1-terra` $1 / $5, `gpt-6.1-sol` $2 / $10) | 그림 출력 100만 토큰당 $30. 한 장 값은 문서에 없어요. | 문서에 없어요 |

아래 계산은 Google Gemini로 만들 때예요. Claude는 글만 만들어서 책 한 권의 글 값이 약 0.002달러예요(기본 종류, 글 2회, 입력 약 2천 토큰과 출력 약 4천 토큰으로 계산). 그림 값은 따로 들어요. 직접 올리면 0원이에요. OpenAI는 그림 한 장 값이 문서에 없어서 계산하지 못했어요.

- 책 한 권 = 그림 9장(표지 1장 + 본문 8장) x $0.0336 = $0.3024
- 글을 쓰는 비용은 무료 한도 안에서는 0원이고, 유료로 내도 한 권에 약 $0.011이에요.
- 책 한 권에 약 0.31달러예요.
- 그림을 다시 만들면 한 장에 $0.0336씩 더 들어요.

| 예시 | 계산 | 합계 |
|---|---|---|
| 선생님 시연 1권 | 1 x 0.31달러 | 약 0.31달러 |
| 학생 25명이 한 권씩 | 25 x 0.31달러 | 약 7.75달러 |
| 학생 25명이 한 권씩, 그림을 다시 2장씩 만들 때 | 25 x (0.31 + 2 x 0.0336)달러 | 약 9.43달러 |

- 이 예시는 학생 수를 곱해 본 것뿐이에요. 학생이 쓰는 기기에서는 Gemini 연결을 쓸 수 없고, Claude와 OpenAI는 위 조건을 갖춰야 해요.
- Gemini로 글만 쓰고 그림은 올리면 무료 한도 안에서 0원이에요.
- 무료 한도의 횟수는 Google AI Studio에서 확인하세요. 이 안내서에는 공식 문서에서 찾지 못한 숫자를 적지 않았어요.
- 한도는 키가 아니라 프로젝트 단위로 걸려요. 같은 프로젝트의 키를 여럿이 쓰면 한도를 함께 써요.
- 가격은 바뀔 수 있어요. 가격 확인일: 2026-11-14

## 개인정보 주의

- 학생에게 진짜 이름, 주소, 전화번호를 쓰지 않게 알려 주세요. 이야기 씨앗 화면에도 "진짜 이름, 주소, 전화번호는 쓰지 마세요."라고 나와요. 주인공 이름은 지어낸 이름으로 해요.
- 지은이 이름은 별명도 괜찮아요.
- **Gemini를 무료 한도로 쓰면 입력한 내용이 제공사의 서비스 개선에 쓰이고, 사람이 검토할 수 있어요.** 약관 원문: "Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services and machine learning technologies..." / "human reviewers may read, annotate, and process your API input and output." / "Do not submit sensitive, confidential, or personal information to the Unpaid Services."
- Gemini를 유료로 쓰면 제품 개선에는 쓰이지 않아요. 다만 악용을 찾아내기 위해 한동안 기록은 남아요.
- Claude와 OpenAI가 입력한 내용을 어떻게 쓰는지는 이번에 확인하지 못했어요. 쓰기 전에 각 회사 약관을 확인하세요.
- 유료로 쓴다고 해서 나이 조건이 없어지지는 않아요. 나이 조건은 따로 있어요.
- 만들던 책은 이 기기의 브라우저에 저장돼요. 이 도구에는 서버가 없어요. 책을 다른 기기로 옮기려면 [작업 파일 받기]로 파일을 받아 옮겨요.
- 키는 이 기기의 브라우저에만 저장돼요. 함께 쓰는 기기에서는 끝나고 [이 기기에서 키 지우기]를 눌러요.
- 작업 파일에는 학생이 쓴 글과 그림이 들어 있어요. 파일을 보관하고 보내는 방법도 학교 규칙을 따르세요.

## 인쇄 맡기는 법

1. 완성 화면에서 [인쇄용 PDF 받기]를 눌러요. ([PDF 받기]는 화면으로 볼 때 쓰는 것이에요.)
2. 책의 쪽 크기는 200 x 200mm 정사각형이에요.
3. 인쇄용 PDF는 사방에 재단 여백 3mm가 들어 있어서 206 x 206mm예요. 300dpi 기준이에요.
4. 인쇄소에는 이렇게 말해요. "재단 여백 3mm가 포함된 206 x 206mm PDF예요. 재단 후 200 x 200mm로 잘라 주세요."
5. 책 순서는 표지, 본문, "만든 사람" 쪽이에요.
6. 인쇄소의 제본 방식과 종이는 인쇄소와 상의하세요. 이 도구는 제본용 쪽 배열을 만들어 주지 않아요.

책에는 이 도구의 이름이나 DI Lab 표기가 들어가지 않아요. AI로 만든 그림이 한 장이라도 있으면 "만든 사람" 쪽에 "그림 일부는 AI(이름)로 만들었습니다"가 자동으로 들어가요. 올린 그림만 있으면 들어가지 않아요.

만든 책의 권리와 글꼴은 [권리 안내](rights.ko.md)를 보세요.

## 자주 생기는 문제

| 문제 | 해결 |
|---|---|
| 만들던 책이 사라졌어요. | 브라우저 데이터가 지워졌거나 다른 기기를 쓴 거예요. 평소에 [작업 파일 받기]로 파일을 받아 두세요. |
| "이 파일은 열 수 없어요." | [작업 파일 받기]로 받은 파일(`.storybook.json`)을 골라야 해요. |
| 그림 파일이 안 올라가요. | "이 파일은 그림으로 열 수 없어요."가 나오면 다른 그림 파일을 골라요. 사진이나 그림 파일이어야 해요. |
| AI가 "이 내용으로는 만들 수 없어요."라고 해요. | 이야기나 그림 설명을 다른 말로 바꿔요. 안전 때문에 막은 거예요. |
| "오늘 쓸 수 있는 횟수를 다 썼어요." | 하루 한도예요. 화면의 시각 뒤에 다시 하거나, 직접 쓰고 그림을 올려요. |
| 그림은 안 되는데 글은 돼요. | Claude는 그림을 만들지 않아요. 직접 올리거나 [자세한 설정]에서 Gemini나 OpenAI 그림용 키를 넣어요. Gemini의 그림은 결제를 연결한 키가 필요해요. 키 확인은 키가 맞는지만 봐요. |
| "키는 맞는 것 같지만, 이 키를 만든 Claude 조직의 설정에서 브라우저 사용이 꺼져 있어요." | Claude 조직의 설정이 브라우저에서 직접 부르는 것을 막은 거예요. 조직을 관리하는 사람에게 켜 달라고 하거나 다른 키를 넣어요. |
| 주인공이 쪽마다 달라 보여요. | 주인공 모습을 더 자세히 쓰고, 마음에 안 드는 그림은 꾸미기에서 [이 그림만 다시 만들기]로 다시 만들어요. |
| 휴대폰에서 글상자가 불편해요. | 큰 화면에서 하거나, 글을 눌러 직접 고치는 방법을 써요. |

키를 받는 법은 [키 받는 법](key-guide.ko.md)을 보세요.
