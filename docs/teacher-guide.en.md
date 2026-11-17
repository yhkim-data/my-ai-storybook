# Teacher guide

**English** | [한국어](teacher-guide.ko.md)

This guide is for teachers who want to run a class with My AI Storybook. Try it now: https://storybook.di-lab.io/

## What you need for class

- A computer, tablet, or phone with internet (one per student)
- A current browser (Chrome, Edge, Safari, and so on)
- No installation, sign-up, or cost. (Costs apply only when you connect AI.)
- If students will add their own drawings: paper, colored pencils, and a device to photograph the drawings
- If you will print the books: a print shop

## What to decide before class

### 1. Will you connect AI?

This tool accepts keys from Google Gemini, Claude, and OpenAI. Each company has its own rules. If your class has students (under 18), read the rules below first. A book can be finished without any AI connection.

**Google Gemini: it cannot be connected on devices that students use.** The text below comes from Google's Gemini API Additional Terms of Service (effective March 23, 2026), checked on 2026-11-14.

- Age: "You must be 18 years of age or older to use the APIs." Only people 18 or older can get a key.
- Services for people under 18: "You also will not use the Services as part of a website, application, or other service (collectively, "API Clients") that is directed towards or is likely to be accessed by individuals under the age of 18." This clause is still in the current version.

In practice, this means:

- Students cannot get a Gemini key.
- On devices and in classes where students use the tool, the Gemini connection cannot be turned on.
- A teacher can still give a demo on their own device with their own key (option B below), and the tool can still be used without any AI connection (option A below).

**Claude (Anthropic): people under 18 may use it when the safeguards are in place.** The text below comes from Anthropic's guidelines for organizations serving minors (the page is dated March 16, 2026), checked on 2026-11-14. Source: https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors

- "organizations providing minors with the ability to directly interact with products that incorporate our API(s) should implement the following safeguards:"
  - "Age verification systems to ensure only intended users can access the product"
  - "Content moderation and filtering to block inappropriate or harmful content"
  - "Monitoring and reporting mechanisms to identify and address potential issues"
  - "Educational resources and guidance for minors on safe and responsible use of the product"
- "It is the responsibility of organizations to comply with all applicable child safety and data privacy regulations, such as the Children's Online Privacy Protection Act (COPPA) in the United States. Compliance with these regulations should be clearly stated on the organization's website or similar public-facing documentation."
- "Organizations must disclose to their users that they are interacting with an AI system rather than a human."
- "Anthropic will periodically audit organizations for compliance with these safeguards." Not following them "may lead to the suspension or termination of your account."
- These guidelines are for organizations. Anthropic's Commercial Terms of Service, which cover API keys and the Console, have no age clause for the key holder (checked 2026-11-14). The 18-or-older rule is in the Consumer Terms (effective 2025-10-08), which cover personal services such as Claude.ai.

**OpenAI: people under 18 may use it when the safeguards are in place.** The text below comes from OpenAI's guidance for serving people under 18 through the API (the page has no date), checked on 2026-11-14. Source: https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance

- "developers should implement additional safeguards when using our API to serve minors (under 18 years old). These are in addition to requirements under our usage policies and terms and conditions."
- "Organizations serving minors must comply with all applicable child protection, safety, and privacy laws, including the Children's Online Privacy Protection Act (COPPA)."
- "You should not use OpenAI services to process any personal data of children under 13 or the applicable age of digital consent without first implementing zero data retention in our API."
- "Organizations serving minors must take reasonable steps to ensure that the content they are serving to minors via the API is safe and age appropriate"
- Safeguards: "Providing age-appropriate disclosures to minors about AI tools and how to use them responsibly." / "Implementing age-appropriate content filters to address potentially sensitive content." / "Implementing reasonable monitoring and reporting mechanisms, including escalation paths for high-risk interactions." / "Where required or otherwise appropriate for your use case, using age assurance systems to ensure only intended users can access the product."
- "OpenAI reserves the right to audit organizations for compliance with this policy."
- **Age clauses in the terms.** Checked in the Korean editions on 2026-11-14. The English originals were not checked.
  - Services Agreement (covers the API, updated 2025-12-01): it forbids customers from letting minors use OpenAI services without the consent of a parent or legal guardian. https://openai.com/ko-KR/policies/services-agreement/
  - Terms of Use (personal use): users must be at least 13, and people under 18 need permission from a parent or legal guardian. https://openai.com/ko-KR/policies/row-terms-of-use/
  - Usage Policies (version effective 2026-11-20): they forbid things such as showing minors content that is not right for their age. https://openai.com/ko-KR/policies/usage-policies/
  - Service Terms (updated 2026-11-13): no age clause. https://openai.com/ko-KR/policies/service-terms/
- **To use OpenAI in a class with students, get consent from their parents or guardians.**
- **The terms do not define the age of a minor. In Korea, it is safest to treat everyone under 19 as a minor.**

**What this tool has, and what it does not have.**

- It has: a fixed rule in every instruction sent to the AI that the book is for children and must not have violence, horror, or sexual content. It never sets a company's safety settings lower than the default. If any picture was made with AI, the "Made by" page of the book says so. It tells students not to write real names, addresses, or phone numbers.
- It does not have: an age check, a way to watch and report problems (this tool has no server), or OpenAI's zero data retention setting for personal data of children under 13 (the organization that holds the key must set it on OpenAI's side).
- So to let students use Claude or OpenAI, **the adult or organization (the school) that got the key must put these safeguards in place and take responsibility.** If you cannot, use option A (no AI connection) or option B (teacher demo).
- Claude writes words only. Add pictures yourself, or enter a separate picture key from another company.
- This guide is not legal advice.

### 2. Choose a format

| Option | What happens on student devices | AI connection | Cost |
|---|---|---|---|
| A. No AI connection | Students write the words and draw the pictures and add them. | None | Free |
| B. Demo only, with the teacher's key | On the teacher's device, using the teacher's own key, show on screen how AI makes a book. Students do not follow along. | Teacher's device only | See the cost section below |
| C. Copy picture note | Students press [Copy picture note] and paste it into another AI app. | Not in this tool | Follows the other app's terms |

- With option C, check the age requirement of the other AI app yourself. This tool does not know that app's terms.
- To practice without a key, add `?mock=1` to the end of the address. You can click through the AI steps with ready-made sample stories and pictures. It uses no key, so it works well for demos.
- After a demo on a shared device, press [Clear keys and finish] and close the browser. Keys are never saved, and they are also cleared on a reload or after the set time without use (20 minutes by default).

### How keys are kept, and class settings

- Keys are never saved (from 2026-11-17). Keys an earlier version saved on the computer are removed the first time the new version opens, with the one-time message "A key saved on this computer by an earlier version was removed."
- When entering a key, students tick "This is my own key, or a key my teacher gave me for this class."
- **Hand out a class settings file:** On the [Connect AI] screen, set the company and AI kind, a connection name (e.g. Class 3), and the minutes before unused keys are cleared (5 to 60), then press [Save settings file]. Give this file to students; they press [Load settings file] and only enter a key. The settings file never holds keys or book content, and key-like text in a file is thrown away.
- **Picture limit:** In [AI usage] at the right of the header, set "Picture limit today on this computer". At 80% of the limit a warning shows, and when it is used up the AI picture and Fix the picture buttons stop. The limit is saved in the settings file too. It counts only on that computer, so set the real spending limit on each company's pages as well ([SECURITY.md](../SECURITY.md)).
- **Finishing on a shared computer:** At the end of class, have students press [Clear keys and finish] and close the browser. To leave no book behind, save it with [Save work file] and tick [Also delete the book on this computer] in the confirm window.

### 3. Will you print?

If you plan to print, read "Ordering prints" below first.

## A two-lesson plan

This example uses 40-minute lessons. Change it to fit your school.

### Lesson 1: Make the story

| Time | Step | What to do |
|---|---|---|
| 5 min | Start | Open the address and flip through a finished book with [See a sample]. |
| 10 min | Story seed | Choose the reader's age, topic, main character's name and look, and number of pages. Do not use real names. |
| 10 min | Plot | Write the title and plot. (Without AI, choose [I'll write it myself].) |
| 15 min | Pages | Write the words for each page, and try writing a picture note too. The picture note can stay empty. |

### Lesson 2: Pictures, decorating, and sharing

| Time | Step | What to do |
|---|---|---|
| 5 min | Art style | Pick a picture style. If you will add your own pictures, any style is fine. |
| 15 min | Pictures | Add a picture for each page with [Add my picture]. You can move on even if some pages have no picture. |
| 10 min | Decorate | Fix the words, move text boxes, and pick fonts and colors. The words on the cover are the book's title. |
| 10 min | Finish and share | Write the author's name, flip through the book while presenting it, and save a PDF or a work file. |

- If students draw their pictures, add separate drawing time between lessons 1 and 2.
- The book in progress is saved automatically in the browser on that device. But it is lost if students switch devices or the browser data is cleared. At the end of class, save a work file with [Save work file]. Next time, open it with [Open a file] on the start screen.
- Starting a new book erases the one in progress. A confirmation box appears first.

## Cost

Without an AI connection, it costs nothing. The price differs by company. Prices were checked in each company's official documents on 2026-11-14. The full record is in [PROVIDER_NOTES](PROVIDER_NOTES.md), which is written in Korean.

| Company | Words | Pictures | Free limit |
|---|---|---|---|
| Google Gemini | Default `gemini-3.5-flash-lite`: input $0.30, output $2.50 (per 1 million tokens) | $0.0336 per picture | For words only |
| Claude | Default `claude-haiku-5-5`: input $0.10, output $0.50 (`claude-sonnet-5-5` $2 / $10, `claude-opus-5-5` $4 / $20) | Does not make pictures | None |
| OpenAI | Default `gpt-6-luna`: input $0.10, output $0.50 (`gpt-6.1-terra` $1 / $5, `gpt-6.1-sol` $2 / $10) | $30 per 1 million picture output tokens. The price per picture is not in the documents. | Not in the documents |

The calculation below is for Google Gemini. Claude writes text only; the text for one book costs about US$0.002 (default AI, 2 text requests, about 2,000 input tokens and 4,000 output tokens). Images cost extra, or nothing if students upload their own. The cost for OpenAI could not be calculated because the per-image price is not published.

- One book = 9 pictures (1 cover and 8 pages) x $0.0336 = $0.3024
- The writing is free within the free limit. Even when paid, it is about $0.011 per book.
- One book costs about 0.31 US dollars.
- Making a picture again costs another $0.0336 each time. [Fix the picture] also counts as one picture per request.
- [AI usage] in the header shows the pictures used on that computer and a rough cost (only for picture kinds with an official price). Check the money left on each company's own pages.

| Example | Calculation | Total |
|---|---|---|
| 1 book for a teacher demo | 1 x 0.31 dollars | about 0.31 dollars |
| 25 students, one book each | 25 x 0.31 dollars | about 7.75 dollars |
| 25 students, one book each, 2 pictures remade each | 25 x (0.31 + 2 x 0.0336) dollars | about 9.43 dollars |

- These examples only multiply by the number of students. On devices that students use, the Gemini connection cannot be used, and Claude and OpenAI need the safeguards above.
- If Gemini writes only the words and you add the pictures yourself, it costs nothing within the free limit.
- For the number of free uses, check Google AI Studio. This guide lists no numbers that are not in the official documentation.
- Limits apply per project, not per key. Keys in the same project share the limit.
- Prices can change. Price check date: 2026-11-14

## Privacy

- Tell students not to write real names, addresses, or phone numbers. The story seed screen also says "Don't write real names, addresses, or phone numbers." The main character's name should be made up.
- The author's name can be a nickname.
- Tell students not to write real names or personal information in the [My own style] box either. What they write there goes into the picture request as it is when AI is connected.
- [Ask AI for help] works only when AI is connected. Without a connection the button cannot be pressed and "Connect AI to use this" is shown. Pressing it sends what is in that box and the book content (topic, main character, plot, the pages before and after) to the connected AI provider.
- **When Gemini is used within the free limit, what is typed in is used by the provider to improve its services, and people may review it.** The terms say: "Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services and machine learning technologies..." / "human reviewers may read, annotate, and process your API input and output." / "Do not submit sensitive, confidential, or personal information to the Unpaid Services."
- When Gemini is used on the paid plan, content is not used to improve products. Logs are still kept for a while to detect abuse.
- Anthropic's Commercial Terms of Service state: "Anthropic may not train models on Customer Content from Services." (checked 2026-11-16). Under OpenAI's Services Agreement, OpenAI does not use customer content to develop or improve its services unless the customer explicitly agrees (checked 2026-11-16). Read the provider's terms before use.
- Paying does not remove the age requirement. It is separate.
- The book in progress is saved in the browser on that device. This tool has no server. To move a book to another device, save a work file with [Save work file] and move the file.
- Keys are never saved; they stay only in browser memory. On a shared device, press [Clear keys and finish] when you finish and close the browser.
- A work file contains the text and images the student made. Follow your school's rules for storing and sending the file.
- For permission to publish student work and consent for personal information (legal-representative consent for children under 14 in Korea), see section 5 of [Rights and terms of use](rights.en.md).

## Ordering prints

1. On the finish screen, press [Get PDF for printing]. ([Get PDF] is for reading on a screen.)
2. The book's page size is a 200 x 200 mm square.
3. The print PDF has a 3 mm cutting margin on all four sides, so it is 206 x 206 mm. It is set for 300 dpi.
4. Tell the print shop: "This is a 206 x 206 mm PDF with a 3 mm cutting margin included. Please trim it to 200 x 200 mm."
5. The book order is cover, story pages, then the "Made by" page.
6. Talk with the print shop about binding and paper. This tool does not make page layouts for binding.

The book does not contain the name of this tool or DI Lab. If even one picture was made with AI, the "Made by" page automatically says that some pictures were made with AI (with the name). If all pictures were added by the student, it does not.

For the rights to the book and the fonts, see [Rights and terms of use](rights.en.md).

## Common problems

| Problem | What to do |
|---|---|
| The book in progress is gone. | Browser data was cleared, or a different device was used. Save work files with [Save work file] regularly. |
| "This file can't be opened." | Pick a file saved with [Save work file] (it ends in `.storybook.json`). |
| A picture will not upload. | If you see "This file can't be opened as a picture.", pick a different picture file. It must be a photo or picture file. |
| AI says "We can't make it with these words." | Change the story or the picture note. It was stopped for safety. |
| "You've used all of today's turns." | This is the daily limit. Try again after the time on screen, or write the words yourself and add your own pictures. |
| Writing works but pictures do not. | Claude does not make pictures. Add your own, or enter a Gemini or OpenAI key for pictures in [More settings]. Gemini pictures need a key with billing connected. The key check only sees that the key is accepted. |
| "The key looks right, but the Claude organization that made it has browser use turned off in its settings." | The Claude organization's setting blocks calls straight from the browser. Ask the person who manages the organization to turn it on, or put in a different key. |
| The character looks different on each page. | Describe the character in more detail, and press [Remake only this picture] on the [Picture] tab in Decorate for pictures you do not like. |
| Text boxes are hard to use on a phone. | Use a bigger screen, or click the words and fix them directly. |

For getting a key, see [How to get a key](key-guide.en.md).
