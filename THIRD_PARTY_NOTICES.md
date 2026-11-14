# 제3자 고지 (Third-Party Notices)

이 도구가 배포물에 담고 있는 글꼴, 라이브러리, 직접 만든 소재의 출처와 라이선스예요.

## 글꼴 (Fonts)

글꼴 파일과 라이선스 전문(`*-OFL.txt`)은 `public/fonts/`에 있어요. 저작권자는 각 OFL 파일의 첫 줄을 그대로 옮긴 것이에요.

| 이름 (Name) | 저작권자 (Copyright) | 라이선스 (License) | 출처 (Source) | 바꾼 점 (Changes) |
|---|---|---|---|---|
| Gowun Dodum (`GowunDodum-Regular.woff2`) | Copyright 2021 The Gowun Dodum Project Authors (https://github.com/yangheeryu/Gowun-Dodum) | SIL OFL 1.1 | Google Fonts 저장소 https://github.com/google/fonts 의 `ofl/` 아래 | 한자를 뺀 부분 글꼴(subset) woff2로 바꿈 |
| Noto Sans KR (`NotoSansKR-VF.woff2`) | Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source' | SIL OFL 1.1 | Google Fonts 저장소 https://github.com/google/fonts 의 `ofl/` 아래 | 한자를 뺀 부분 글꼴(subset) woff2로 바꿈 |
| Gaegu (`Gaegu-Regular.woff2`) | Copyright 2018 The Gaegu Project Authors | SIL OFL 1.1 | Google Fonts 저장소 https://github.com/google/fonts 의 `ofl/` 아래 | 한자를 뺀 부분 글꼴(subset) woff2로 바꿈 |

- 이 도구에서 쓰는 곳: Gowun Dodum은 화면 제목과 책의 "둥근 글씨", Noto Sans KR은 화면 본문과 책의 "또박또박 글씨", Gaegu는 책의 "손글씨"예요.
- OFL 글꼴은 책에 써서 인쇄하고 나눠 주고 팔아도 돼요. 글꼴 파일만 따로 팔 수는 없어요.
- 글꼴 파일을 바꾸거나 다시 나눌 때는 먼저 각 `*-OFL.txt`를 읽어 보세요.

## 라이브러리 (Libraries)

버전은 `node_modules`에 설치된 것(`package.json`의 범위 안)이에요. 이 표의 라이브러리는 배포물에 들어가요.

| 이름 (Name) | 버전 (Version) | 라이선스 (License) | 주소 (URL) |
|---|---|---|---|
| react | 19.3.1 | MIT | https://github.com/facebook/react |
| react-dom | 19.3.1 | MIT | https://github.com/facebook/react |
| zustand | 5.1.0 | MIT | https://github.com/pmndrs/zustand |
| pdf-lib | 1.17.1 | MIT | https://github.com/Hopding/pdf-lib |
| html-to-image | 1.11.13 | MIT | https://github.com/bubkoo/html-to-image |
| fflate | 0.8.3 | MIT | https://github.com/101arrowz/fflate |
| @anthropic-ai/sdk | 1.8.0 | Apache-2.0 | https://github.com/anthropics/anthropic-sdk-typescript |
| vite (빌드 도구, build tool) | 8.3.8 | MIT | https://github.com/vitejs/vite |

`@anthropic-ai/sdk`는 Claude 키를 쓸 때만 내려받는 별도 파일로 들어가요. 저작권자는 Anthropic, PBC예요(Copyright 2023). 이 라이브러리는 1.0.0 판부터 MIT에서 Apache License 2.0으로 바뀌었어요. 지금 쓰는 1.8.0은 Apache-2.0이에요. 라이선스 전문은 `node_modules/@anthropic-ai/sdk/LICENSE`에 있고, 바뀌기 전 판에 적용되던 MIT 안내는 같은 폴더의 `LICENSE-MIT`에 있어요.

개발 도구(typescript Apache-2.0, eslint MIT, vitest MIT, playwright Apache-2.0 등)는 개발과 검사에만 쓰고 배포물에는 들어가지 않아요. 전체 목록은 `package.json`의 `devDependencies`에 있어요.

## 직접 만든 소재 (Original materials)

- 예시 그림: `src/art/scenes.ts`의 SVG 장면은 이 프로젝트에서 코드로 직접 그렸어요.
- 아이콘: 화면의 아이콘도 이 프로젝트에서 코드로 직접 그렸어요.
- 이 소재들은 이 프로젝트와 함께 MIT 라이선스로 배포돼요. (저작권자: DI Lab (Data Insight Lab))
- 다른 곳에서 가져온 그림이나 아이콘은 쓰지 않았어요.

## 이 도구 자체 (This project)

MIT 라이선스예요. [LICENSE](LICENSE)를 보세요.
