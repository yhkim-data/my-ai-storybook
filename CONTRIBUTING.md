# 기여 안내 / Contributing

[한국어](#한국어) | [English](#english)

## 한국어

### 환영해요

"나만의 AI 동화책"에 관심을 가져 주셔서 고마워요. 오타 고치기, 번역 다듬기, 버그 알리기, 기능 제안, 코드 고치기 모두 환영해요.

### 이슈와 PR 올리는 법

1. 저장소(https://github.com/yhkim-data/my-ai-storybook)에서 먼저 같은 이슈가 있는지 찾아봐요.
2. 없으면 새 이슈를 만들어요. 무엇이 일어났는지, 어떻게 하면 다시 나타나는지, 쓴 브라우저와 기기를 적어요.
3. 코드를 고치려면 저장소를 포크해서 새 갈래(branch)를 만들어요.
4. 고친 뒤 아래 검사를 모두 돌려요.
5. PR을 올리고, 무엇을 왜 고쳤는지 쉬운 말로 적어요. 화면이 바뀌면 사진을 붙여요.
6. 한 PR에는 한 가지 일만 담아 주세요.

이슈와 PR에 실제 키나 개인정보를 붙이지 마세요.

### 검사 통과 조건

PR을 올리기 전에 아래 명령이 모두 통과해야 해요.

```
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:secrets
npm run check:i18n
npm run check:links
```

화면 동작을 바꿨다면 `npm run e2e`도 돌려요. 자세한 내용은 [개발 문서](docs/DEVELOPMENT.ko.md)를 보세요.

### 코드 규칙

- 변수와 함수 이름은 영어 snake_case예요. React 부품은 PascalCase, 훅은 `useXxx`예요.
- 주석은 한국어로 써요.
- 모든 함수 위에 설명 주석을 달아요.
- 매직 넘버는 상수로 정해요.
- 화면 문구는 `src/i18n/ko.json`과 `src/i18n/en.json`에 같은 키로 넣어요.
- 학생이 보는 문구에는 "프롬프트", "API", "토큰", "모델"을 쓰지 않아요.

### 꼭 지켜야 할 것

- 실제 키를 코드, 검사, 문서, 이슈, PR 어디에도 넣지 않아요.
- 다른 서비스의 화면 구성, 문구, 그림, 코드를 복사하지 않아요.
- 그림체 이름에 작가, 회사, 작품 이름을 쓰지 않아요. "수채화", "크레용"처럼 일반적인 기법 이름만 써요.
- 글꼴은 SIL OFL 라이선스인 것만 넣어요.
- 새 AI 제공사를 넣으려면 공식 문서를 직접 확인하고 `docs/PROVIDER_NOTES.md`에 기록해요. 확인하지 못한 제공사는 넣지 않아요.
- 책 안에는 도구 이름이나 DI Lab 표기를 자동으로 넣지 않아요. 책은 만든 사람의 것이에요.

### 기여물의 라이선스

기여한 내용은 이 프로젝트와 같은 MIT 라이선스로 배포돼요. PR을 올리는 것은 이에 동의한다는 뜻이에요. 내가 쓴 것이 아니거나 라이선스가 맞지 않는 것은 올리지 마세요.

---

## English

### Welcome

Thank you for your interest in My AI Storybook. Fixing typos, polishing translations, reporting bugs, suggesting features, and changing code are all welcome.

### How to open an issue or a pull request

1. Look at the repository (https://github.com/yhkim-data/my-ai-storybook) to see whether the same issue already exists.
2. If not, open a new issue. Write what happened, how to make it happen again, and which browser and device you used.
3. To change code, fork the repository and make a new branch.
4. After your change, run all the checks below.
5. Open a pull request and explain what you changed and why in plain words. Add a screenshot if a screen changed.
6. Please keep one pull request to one purpose.

Do not paste a real key or personal information into an issue or pull request.

### Checks that must pass

Before you open a pull request, all of these commands must pass.

```
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:secrets
npm run check:i18n
npm run check:links
```

If you changed how a screen behaves, also run `npm run e2e`. For more, see the [development guide](docs/DEVELOPMENT.ko.md) (Korean).

### Code rules

- Variable and function names are English snake_case. React components are PascalCase and hooks are `useXxx`.
- Comments are written in Korean.
- Put a comment that explains what it does above every function.
- Put magic numbers into named constants.
- Add screen text to both `src/i18n/ko.json` and `src/i18n/en.json` under the same key.
- Text that students see must not use the words "prompt", "API", "token", or "model".

### Rules you must follow

- Never put a real key in code, tests, documents, issues, or pull requests.
- Do not copy another service's screen layout, wording, pictures, or code.
- Do not use an artist's, company's, or work's name in an art style name. Use general technique names such as "watercolor" and "crayon".
- Add only fonts under the SIL OFL license.
- To add a new AI provider, read its official documents yourself and record what you found in `docs/PROVIDER_NOTES.md`. Do not add a provider you could not check.
- Never add the tool's name or DI Lab to the inside of a book automatically. The book belongs to the person who made it.

### License of your contribution

What you contribute is shared under the same MIT License as this project. Opening a pull request means you agree to this. Do not submit anything you did not write or whose license does not fit.
