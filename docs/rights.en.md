# Rights and terms of use

**English** | [한국어](rights.ko.md)

This document explains the rights to books made with My AI Storybook and the terms that apply to them. It is not legal advice. Each statement is current as of the check date shown.

## 1. Basic principle

만든 책의 권리는 만든 사람에게 있습니다. 이 도구와 DI Lab은 결과물에 어떤 권리도 주장하지 않습니다.

The rights to the book you make belong to you. This tool and DI Lab claim no rights to anything you create.

- The tool's name and the DI Lab mark are not added to your book. The PDF file information does not include the tool's name either.
- The tool does not ask for permission or charge any fee for books you make.
- The tool's source code is released under the MIT License (copyright DI Lab · Data Insight Lab). The license covers only the tool's code, not the books you make. See [LICENSE](../LICENSE) for the full text.

## 2. Rights by part of the book

### Text you write

Text you write yourself is your own work.

### Text and images made by AI

The Korean Copyright Act defines a work as follows.

> "“저작물”은 인간의 사상 또는 감정을 표현한 창작물을 말한다." ("Work" means a creative production that expresses human thoughts or emotions.) (Copyright Act, Article 2, item 1)

- Source: Korea Law Information Center, <https://www.law.go.kr/법령/저작권법> (Act No. 21595, in force 2026-10-29, checked 2026-11-16)

Guides from the Ministry of Culture, Sports and Tourism and the Korea Copyright Commission follow this definition. They do not treat AI output itself as a protected work, but parts where a person added creative work can be protected.

- *Generative AI Copyright Guide* (published 2023-12-27): AI output itself is not recognized as a work under the current law, and where human creativity is added by editing, adding to, or arranging the output, that part can be recognized as a work.
- *Guide to Copyright Registration of Works Made with Generative AI* (published June 2025): examples of human creative contribution include creative "additional work" such as editing the AI output, and creative selection and arrangement of AI outputs.
- Source: Korea Copyright Commission, *AI and copyright guides (4)*, <https://www.copyright.or.kr/notify/notice/view.do?brdctsno=55402> (posted 2026-04-30, checked 2026-11-16). The guides are in Korean.

This means the parts of a book that use AI text or images as they are may not be protected by copyright. Parts with a human creative contribution, such as text you rewrote or the way you chose and arranged pages, can be protected.

### Images you add

Pictures you draw or photos you take are your own work. To use someone else's pictures, real people, existing characters, or trademarks, you need permission from the rights holder.

- You cannot use pictures found on the internet without permission.
- Avoid uploading pictures that contain characters from comics, films, or games, or trademarks.
- Images made with another AI service follow that service's terms.
- If a photo shows another person's face, get that person's permission. Photos of children need a parent's or guardian's permission.

### Default layout and design

DI Lab claims no rights to the default layouts, text box shapes, colors, and other basic design the tool provides.

### Fonts

The three fonts used in books are released under the SIL Open Font License 1.1 (OFL). Books that use these fonts can be printed, shared, and sold. The font files themselves cannot be sold on their own.

| Font name in the book | Font | Used on screen for |
|---|---|---|
| Round letters | Gowun Dodum | Screen titles |
| Neat letters | Noto Sans KR | Screen body text |
| Handwriting | Gaegu | Not used |

- The full license text for each font is in the `public/fonts/` folder of the repository as `*-OFL.txt`.
- The fonts come from the `ofl/` folder of the Google Fonts repository (<https://github.com/google/fonts>) and were converted to subset woff2 files without Chinese characters.
- See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) (Korean) for details.

## 3. Output rights under the AI providers' terms

The tool can connect to AI from Google Gemini, Claude (Anthropic), and OpenAI. Each provider's terms say the following about output.

| Provider | Terms | Clause on output | Checked |
|---|---|---|---|
| OpenAI | Services Agreement, Korean edition <https://openai.com/ko-KR/policies/services-agreement/> (updated 2025-12-01) | "고객이 모든 출력물을 소유합니다." (The customer owns all output.) It also states that OpenAI assigns its rights in the output to the customer. | 2026-11-16 |
| Anthropic (Claude) | Commercial Terms of Service <https://www.anthropic.com/legal/commercial-terms> (Effective Jun 17, 2025). Applies to API keys. | "Anthropic agrees that Customer (a) retains all rights to its Inputs, and (b) owns its Outputs." / "Anthropic hereby assigns to Customer its right, title and interest (if any) in and to Outputs." | 2026-11-16 |
| Google (Gemini) | Gemini API Additional Terms of Service <https://aistudio.google.com/docs/terms> (Effective March 23, 2026) | "Some of our Services allow you to generate original content. Google won't claim ownership over that content." | 2026-11-16 |

A provider assigning or not claiming rights in the output is a separate question from whether the law protects that output as a work. Even when a provider assigns its rights, the AI-made parts themselves may not be protected by copyright, as described in section 2.

Images made by Google's image AI include an invisible SynthID watermark. The official documentation says: "All generated images include a SynthID watermark." (<https://aistudio.google.com/docs/image-generation>, checked 2026-11-14)

## 4. Publishing, printing, and selling

- The tool places no limits on publishing, printing, or selling the books you make.
- Contests, publishers, and sales platforms may require you to disclose the use of AI. Check their rules before you submit or sell.
- If the book has at least one AI-made picture, the sentence "Some pictures were made with AI (name)" is added automatically to the "Made by" page, with the name of the AI that made the pictures. This lets readers know AI was used and helps you meet disclosure rules like those above. If all pictures were added by you, the sentence is not added.

## 5. Use in schools and organizations

- Students own the copyright in the works they make.
- To publish student work on a website, social media, or in a collection, an organization needs permission to use the work from the student and a parent or guardian. To publish personal information such as names or faces with the work, it also needs consent to collect and use that information.
- Under Korean law, processing the personal information of children under 14 requires consent from a legal representative.

> "개인정보처리자는 만 14세 미만 아동의 개인정보를 처리하기 위하여 이 법에 따른 동의를 받아야 할 때에는 그 법정대리인의 동의를 받아야 하며, 법정대리인이 동의하였는지를 확인하여야 한다." (When consent under this Act is needed to process the personal information of a child under 14, the controller must obtain consent from the child's legal representative and confirm it.) (Personal Information Protection Act, Article 22-2, paragraph 1)

- Source: Korea Law Information Center, <https://www.law.go.kr/법령/개인정보보호법> (Act No. 21445, in force 2026-09-11, checked 2026-11-16)
- Before class, it is a good idea to include permission to use the work, consent to collect and use personal information, and the scope of publication in one consent form.
- Age rules for AI connections are in the [teacher guide](teacher-guide.en.md) and [How to get a key](key-guide.en.md).

## 6. Disclaimer and contact

- This document is not legal advice. For a specific case, consult a professional.
- Copyright and privacy laws differ by country. This document is based on Korean law.
- Laws, government guides, and provider terms may change after the check dates.
- For questions, open an issue in the repository's [Issues](https://github.com/yhkim-data/my-ai-storybook/issues).
