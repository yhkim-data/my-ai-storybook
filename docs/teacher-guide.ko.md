# 선생님 안내서

[English](teacher-guide.en.md) | **한국어**

이 안내서는 "나만의 AI 동화책"을 수업에 활용하려는 선생님을 위한 문서입니다. 바로 써보기: https://storybook.di-lab.io/

## 수업 준비물

- 인터넷에 연결된 컴퓨터, 태블릿 또는 휴대폰 (학생 1인당 1대)
- 최신 브라우저 (Chrome, Edge, Safari 등)
- 설치, 회원가입, 비용은 필요하지 않습니다. (AI를 연결해 쓸 때만 비용이 들 수 있습니다.)
- 직접 그린 그림을 올리려면 종이, 색연필, 그림을 사진으로 찍을 기기
- 책을 인쇄하려면 인쇄를 맡길 곳

## 수업 전에 정할 것

### 1. AI 연결 여부

이 도구는 Google Gemini, Claude, OpenAI의 키를 쓸 수 있으며, 회사마다 이용 조건이 다릅니다. 학생(18세 미만)이 참여하는 수업이라면 아래 조건을 먼저 확인하십시오. 이 도구는 AI 연결 없이도 책을 끝까지 만들 수 있습니다.

**Google Gemini: 학생이 쓰는 기기에서는 연결할 수 없습니다.** 아래는 Google의 Gemini API 약관(2026-03-23 시행판)에서 2026-11-14에 확인한 내용입니다.

- 나이: "You must be 18 years of age or older to use the APIs." 키는 만 18세 이상만 받을 수 있습니다.
- 18세 미만 대상 서비스: "You also will not use the Services as part of a website, application, or other service (collectively, "API Clients") that is directed towards or is likely to be accessed by individuals under the age of 18." 이 조항은 현재 판에도 있습니다.

이 조항의 의미는 다음과 같습니다.

- 학생은 Gemini 키를 받을 수 없습니다.
- 학생이 쓰는 기기와 수업에서는 Gemini 연결을 켜 둘 수 없습니다.
- 선생님이 자신의 기기에서 자신의 키로 시연만 하는 방식(아래 B)과 AI 연결 없이 쓰는 방식(아래 A)은 가능합니다.

**Claude (Anthropic): 조건을 갖추면 18세 미만이 쓸 수 있습니다.** 아래는 Anthropic의 기관용 안내(문서에 표시된 날짜 2026-03-16)에서 2026-11-14에 확인한 내용입니다. 출처: https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors

- "organizations providing minors with the ability to directly interact with products that incorporate our API(s) should implement the following safeguards:"
  - "Age verification systems to ensure only intended users can access the product"
  - "Content moderation and filtering to block inappropriate or harmful content"
  - "Monitoring and reporting mechanisms to identify and address potential issues"
  - "Educational resources and guidance for minors on safe and responsible use of the product"
- "It is the responsibility of organizations to comply with all applicable child safety and data privacy regulations, such as the Children's Online Privacy Protection Act (COPPA) in the United States. Compliance with these regulations should be clearly stated on the organization's website or similar public-facing documentation."
- "Organizations must disclose to their users that they are interacting with an AI system rather than a human."
- "Anthropic will periodically audit organizations for compliance with these safeguards." 지키지 않으면 "may lead to the suspension or termination of your account."
- 위 내용은 기관용 안내입니다. 키와 콘솔에 적용되는 Anthropic 상업 서비스 약관(Commercial Terms of Service)에는 키를 받는 사람의 나이 조항이 없습니다(2026-11-14 확인). 18세 이상 조건은 Claude.ai 같은 개인용 서비스 약관(Consumer Terms, 2025-10-08 시행)에 있습니다.

**OpenAI: 조건을 갖추면 18세 미만이 쓸 수 있습니다.** 아래는 OpenAI의 18세 미만 API 안내(문서에 날짜 없음)에서 2026-11-14에 확인한 내용입니다. 출처: https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance

- "developers should implement additional safeguards when using our API to serve minors (under 18 years old). These are in addition to requirements under our usage policies and terms and conditions."
- "Organizations serving minors must comply with all applicable child protection, safety, and privacy laws, including the Children's Online Privacy Protection Act (COPPA)."
- "You should not use OpenAI services to process any personal data of children under 13 or the applicable age of digital consent without first implementing zero data retention in our API."
- "Organizations serving minors must take reasonable steps to ensure that the content they are serving to minors via the API is safe and age appropriate"
- 조치: "Providing age-appropriate disclosures to minors about AI tools and how to use them responsibly." / "Implementing age-appropriate content filters to address potentially sensitive content." / "Implementing reasonable monitoring and reporting mechanisms, including escalation paths for high-risk interactions." / "Where required or otherwise appropriate for your use case, using age assurance systems to ensure only intended users can access the product."
- "OpenAI reserves the right to audit organizations for compliance with this policy."
- **약관의 나이 조항.** 2026-11-14에 한국어판으로 확인한 내용입니다. 영어 원문은 확인하지 않았습니다.
  - 서비스 계약(API에 적용, 업데이트 2025-12-01): "부모 또는 법정대리인의 동의 없이 미성년자가 OpenAI 서비스를 사용하도록 허용하는 행위"를 금지합니다. https://openai.com/ko-KR/policies/services-agreement/
  - 이용약관(개인용): 만 13세 이상이어야 하며, 18세 미만은 부모나 법정대리인의 허가가 필요합니다. https://openai.com/ko-KR/policies/row-terms-of-use/
  - 이용정책(2026-11-20 시행판): 미성년자에게 나이에 맞지 않는 콘텐츠를 제공하는 행위 등을 금지합니다. https://openai.com/ko-KR/policies/usage-policies/
  - 서비스 약관(업데이트 2026-11-13): 나이 조항이 없습니다. https://openai.com/ko-KR/policies/service-terms/
- **OpenAI로 학생 수업을 하려면 보호자 동의를 받으십시오.**
- **약관에 미성년자의 나이 정의가 없습니다. 한국에서는 만 19세 미만을 기준으로 삼는 것이 안전합니다.**

**이 도구가 갖춘 것과 갖추지 못한 것**

- 갖춘 것: AI에 보내는 지시문에 어린이용이며 폭력, 공포, 선정적인 내용을 쓰지 않는다는 규칙을 고정해 두었습니다. 회사의 안전 설정을 기본값보다 낮추지 않습니다. AI 그림이 있으면 책의 "만든 사람" 쪽에 AI 사용 표시가 들어갑니다. 진짜 이름, 주소, 전화번호를 쓰지 말라는 안내가 있습니다.
- 갖추지 못한 것: 나이 확인 장치, 모니터링과 신고 장치(이 도구에는 서버가 없습니다), 13세 미만 개인정보에 대한 OpenAI의 zero data retention 설정(키를 가진 조직이 OpenAI 쪽에서 설정해야 합니다).
- 따라서 학생이 Claude나 OpenAI를 쓰게 하려면 **키를 받은 성인이나 기관(학교)이 위 조치를 갖추고 책임져야 합니다.** 갖추지 못했다면 A 방식(AI 연결 없이)이나 B 방식(선생님 시연)을 쓰십시오.
- Claude는 글만 만듭니다. 그림은 직접 올리거나 다른 회사의 그림용 키를 따로 넣습니다.
- 이 안내서는 법률 자문이 아닙니다.

### 2. 진행 방식 선택

| 방식 | 학생 기기에서 하는 일 | AI 연결 | 비용 |
|---|---|---|---|
| A. AI 연결 없이 | 글을 직접 쓰고, 그림을 직접 그려서 올립니다. | 없음 | 무료 |
| B. 선생님 키로 시연만 | 선생님 기기에서 선생님의 키로 AI가 책을 만드는 과정을 보여 줍니다. 학생은 따라 하지 않습니다. | 선생님 기기만 | 아래 비용 계산 참조 |
| C. 그림 설명 복사 | 학생이 [그림 설명 복사]를 눌러 다른 AI 서비스에 붙여넣습니다. | 이 도구에는 없음 | 해당 서비스의 조건을 따름 |

- C 방식에서도 학생이 쓰는 다른 AI 서비스의 나이 조건을 따로 확인해야 합니다. 이 도구는 그 서비스의 조건을 알 수 없습니다.
- 키 없이 연습하려면 주소 끝에 `?mock=1`을 붙입니다. 미리 준비된 예시 이야기와 그림으로 AI 단계를 체험할 수 있습니다. 키를 쓰지 않으므로 시연에 적합합니다.
- 함께 쓰는 기기에서 시연했다면 시연 후 [AI 연결하기] 화면에서 [이 기기에서 키 지우기]를 누르십시오.

### 3. 인쇄 여부

인쇄하려면 아래 "인쇄 의뢰 방법"을 먼저 확인하십시오.

## 2차시 진행 예시

한 차시를 40분으로 잡은 예시입니다. 학교 상황에 맞게 조정하십시오.

### 1차시: 이야기 만들기

| 시간 | 단계 | 활동 |
|---|---|---|
| 5분 | 시작 | 주소를 열고 [체험판 보기]로 완성된 책을 넘겨 봅니다. |
| 10분 | 이야기 씨앗 | 읽을 사람, 주제, 주인공 이름과 모습, 쪽수를 정합니다. 진짜 이름은 쓰지 않습니다. |
| 10분 | 줄거리 | 제목과 줄거리를 씁니다. (AI 없이 쓸 때는 [내가 직접 쓸게요]) |
| 15분 | 쪽 나누기 | 쪽마다 글과 그림 설명을 씁니다. 그림 설명은 비워 두어도 됩니다. |

### 2차시: 그림, 꾸미기, 발표

| 시간 | 단계 | 활동 |
|---|---|---|
| 5분 | 그림체 | 그림체를 고릅니다. 직접 그린 그림을 올린다면 아무것이나 골라도 됩니다. |
| 15분 | 그림 | 쪽마다 [내 그림 올리기]로 그림을 올립니다. 그림이 없는 쪽이 있어도 다음 단계로 갈 수 있습니다. |
| 10분 | 꾸미기 | 글을 고치고, 글상자를 옮기고, 글꼴과 색을 고릅니다. 표지의 글이 책 제목입니다. |
| 10분 | 완성과 발표 | 지은이 이름을 쓰고 책을 넘겨 보며 발표합니다. PDF나 작업 파일을 받습니다. |

- 그림을 직접 그리는 수업이라면 1차시와 2차시 사이에 그림 그리는 시간을 따로 두십시오.
- 만들던 책은 이 기기의 브라우저에 자동 저장됩니다. 다만 기기가 바뀌거나 브라우저 데이터를 지우면 사라집니다. 수업이 끝나면 [작업 파일 받기]로 파일을 받아 두십시오. 다음 시간에 시작 화면의 [파일 불러오기]로 열 수 있습니다.
- 새 책을 시작하면 만들던 책이 지워집니다. 이때 확인 창이 나옵니다.

## 비용 계산

AI 연결 없이 쓰면 비용이 들지 않습니다. 회사마다 가격이 다르며, 가격은 2026-11-14에 각 회사의 공식 문서에서 확인했습니다. 자세한 기록은 [PROVIDER_NOTES](PROVIDER_NOTES.md)에 있습니다.

| 회사 | 글 | 그림 | 무료 한도 |
|---|---|---|---|
| Google Gemini | 기본 `gemini-3.5-flash-lite`: 입력 $0.30, 출력 $2.50 (100만 토큰당) | 1장 $0.0336 | 글에만 있음 |
| Claude | 기본 `claude-haiku-5-5`: 입력 $0.10, 출력 $0.50 (`claude-sonnet-5-5` $2 / $10, `claude-opus-5-5` $4 / $20) | 지원하지 않음 | 없음 |
| OpenAI | 기본 `gpt-6-luna`: 입력 $0.10, 출력 $0.50 (`gpt-6.1-terra` $1 / $5, `gpt-6.1-sol` $2 / $10) | 그림 출력 100만 토큰당 $30. 1장 가격은 문서에 없음. | 문서에 없음 |

아래 계산은 Google Gemini로 만들 때의 비용입니다. Claude는 글만 만들며, 책 한 권의 글 비용은 약 0.002달러입니다(기본 AI, 글 요청 2회, 입력 약 2천 토큰과 출력 약 4천 토큰 기준). 그림 비용은 별도이며, 직접 올리면 들지 않습니다. OpenAI는 그림 1장 가격이 문서에 없어 계산하지 못했습니다.

- 책 한 권 = 그림 9장(표지 1장, 본문 8장) x $0.0336 = $0.3024
- 글 비용은 무료 한도 안에서는 0원이고, 유료로 써도 한 권에 약 $0.011입니다.
- 책 한 권에 약 0.31달러입니다.
- 그림을 다시 만들면 1장에 $0.0336씩 추가됩니다.

| 예시 | 계산 | 합계 |
|---|---|---|
| 선생님 시연 1권 | 1 x 0.31달러 | 약 0.31달러 |
| 학생 25명이 한 권씩 | 25 x 0.31달러 | 약 7.75달러 |
| 학생 25명이 한 권씩, 그림을 2장씩 다시 만들 때 | 25 x (0.31 + 2 x 0.0336)달러 | 약 9.43달러 |

- 이 예시는 학생 수를 곱한 계산일 뿐입니다. 학생이 쓰는 기기에서는 Gemini 연결을 쓸 수 없으며, Claude와 OpenAI는 위 조건을 갖춰야 합니다.
- Gemini로 글만 만들고 그림은 직접 올리면 무료 한도 안에서 비용이 들지 않습니다.
- 무료 한도의 횟수는 Google AI Studio에서 확인하십시오. 이 안내서에는 공식 문서에서 확인하지 못한 숫자를 적지 않았습니다.
- 한도는 키가 아니라 프로젝트 단위로 적용됩니다. 같은 프로젝트의 키를 여럿이 쓰면 한도를 함께 씁니다.
- 가격은 바뀔 수 있습니다. 가격 확인일: 2026-11-14

## 개인정보 유의사항

- 학생에게 진짜 이름, 주소, 전화번호를 쓰지 않도록 안내하십시오. 이야기 씨앗 화면에도 "진짜 이름, 주소, 전화번호는 쓰지 마세요."라는 안내가 있습니다. 주인공 이름은 지어낸 이름을 씁니다.
- 지은이 이름은 별명을 써도 됩니다.
- **Gemini를 무료 한도로 쓰면 입력한 내용이 제공사의 서비스 개선에 쓰이고, 사람이 검토할 수 있습니다.** 약관 원문: "Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services and machine learning technologies..." / "human reviewers may read, annotate, and process your API input and output." / "Do not submit sensitive, confidential, or personal information to the Unpaid Services."
- Gemini를 유료로 쓰면 제품 개선에는 쓰이지 않습니다. 다만 악용 탐지를 위해 일정 기간 기록이 남습니다.
- Anthropic 상업 서비스 약관에는 "Anthropic may not train models on Customer Content from Services."라는 조항이 있습니다(2026-11-16 확인). OpenAI 서비스 계약에 따르면 고객이 명시적으로 동의하지 않으면 OpenAI는 고객 콘텐츠를 서비스 개발이나 개선에 쓰지 않습니다(2026-11-16 확인). 사용 전에 해당 약관을 확인하십시오.
- 유료로 쓰더라도 나이 조건은 그대로 적용됩니다.
- 만들던 책은 이 기기의 브라우저에 저장됩니다. 이 도구에는 서버가 없습니다. 책을 다른 기기로 옮기려면 [작업 파일 받기]로 받은 파일을 옮깁니다.
- 키는 이 기기의 브라우저에만 저장됩니다. 함께 쓰는 기기에서는 사용 후 [이 기기에서 키 지우기]를 누르십시오.
- 작업 파일에는 학생이 쓴 글과 그림이 들어 있습니다. 파일의 보관과 전송은 학교 규정을 따르십시오.
- 학생 작품을 공개할 때의 저작물 이용 허락과 개인정보 동의(만 14세 미만은 법정대리인 동의)는 [권리와 이용 조건](rights.ko.md)의 5장을 참조하십시오.

## 인쇄 의뢰 방법

1. 완성 화면에서 [인쇄용 PDF 받기]를 누릅니다. ([PDF 받기]는 화면 보기용입니다.)
2. 책의 쪽 크기는 200 x 200mm 정사각형입니다.
3. 인쇄용 PDF는 사방에 재단 여백 3mm가 포함되어 206 x 206mm이며, 300dpi 기준입니다.
4. 인쇄소에는 다음과 같이 전달합니다. "재단 여백 3mm가 포함된 206 x 206mm PDF입니다. 재단 후 200 x 200mm로 잘라 주십시오."
5. 책의 순서는 표지, 본문, "만든 사람" 쪽입니다.
6. 제본 방식과 종이는 인쇄소와 상의하십시오. 이 도구는 제본용 쪽 배열을 만들지 않습니다.

책에는 이 도구의 이름이나 DI Lab 표기가 들어가지 않습니다. AI로 만든 그림이 한 장이라도 있으면 "만든 사람" 쪽에 "그림 일부는 AI(이름)로 만들었습니다"라는 문장이 자동으로 들어갑니다. 직접 올린 그림만 있으면 들어가지 않습니다.

만든 책의 권리와 글꼴은 [권리와 이용 조건](rights.ko.md)을 참조하십시오.

## 자주 생기는 문제

| 문제 | 해결 방법 |
|---|---|
| 만들던 책이 사라졌습니다. | 브라우저 데이터가 지워졌거나 다른 기기를 쓴 경우입니다. 평소에 [작업 파일 받기]로 파일을 받아 두십시오. |
| "이 파일은 열 수 없어요." | [작업 파일 받기]로 받은 파일(`.storybook.json`)을 골라야 합니다. |
| 그림 파일이 올라가지 않습니다. | "이 파일은 그림으로 열 수 없어요."가 나오면 다른 그림 파일을 고릅니다. 사진이나 그림 파일이어야 합니다. |
| AI가 "이 내용으로는 만들 수 없어요."라고 합니다. | 이야기나 그림 설명을 다른 표현으로 바꿉니다. 안전 기준에 따라 막힌 것입니다. |
| "오늘 쓸 수 있는 횟수를 다 썼어요." | 하루 한도에 도달했습니다. 화면에 나온 시각 이후에 다시 하거나, 글을 직접 쓰고 그림을 올립니다. |
| 글은 되는데 그림이 되지 않습니다. | Claude는 그림을 만들지 않습니다. 직접 올리거나 [자세한 설정]에서 Gemini나 OpenAI의 그림용 키를 넣습니다. Gemini의 그림은 결제가 연결된 키가 필요합니다. 연결 확인은 키가 유효한지만 확인합니다. |
| "키는 맞는 것 같지만, 이 키를 만든 Claude 조직의 설정에서 브라우저 사용이 꺼져 있어요." | Claude 조직 설정에서 브라우저의 직접 호출을 막은 상태입니다. 조직 관리자에게 설정 변경을 요청하거나 다른 키를 넣습니다. |
| 주인공이 쪽마다 달라 보입니다. | 주인공 모습을 더 자세히 쓰고, 마음에 들지 않는 그림은 꾸미기 단계에서 [이 그림만 다시 만들기]로 다시 만듭니다. |
| 휴대폰에서 글상자를 다루기 불편합니다. | 큰 화면에서 작업하거나, 글을 눌러 직접 고치는 방법을 씁니다. |

키 발급은 [키 발급 방법](key-guide.ko.md)을 참조하십시오.
