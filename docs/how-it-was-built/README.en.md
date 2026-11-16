# How it was built

[한국어](README.md)

"My AI Storybook" was built by Claude Code. A person gave it one instruction file, five screen mockups, and three helper-agent definitions. Claude Code read the instruction file from start to end and did the building, testing, writing, and publishing.

## What is in this folder

| File | What it is |
|---|---|
| [`STORYBOOK_BUILD.md`](STORYBOOK_BUILD.md) | The instruction file (in Korean). It says what to build, the rules to keep, the plain-language rules, the order of work, how to check its own work, and when the work is done. |
| [`design/`](design/) | Five screen mockups (start, connect AI, story seed, pictures, decorate). They are in a design tool format (`.dc.html`), so they do not open as-is in a browser. They are for reading the layout, words, colors, and sizes. |
| [`agents/`](agents/) | Three helper-agent definitions: `builder` (code and its tests), `writer` (Korean and English documents), and `checker` (running checks and summing up the results). |

The instruction file says the helper-agent definitions are in an `agents-setup/` folder. For the public release they were moved to `agents/` in this folder. To use them, copy them into `.claude/agents/`.

## Who did what

**What a person did**

- Decided what to build and wrote down the needs.
- Wrote the instruction file and mockups, and reviewed what Claude Code made.
- Read the AI companies' terms in a browser where automatic tools could not open them.

**What Claude Code did**

- Building: the screens, saving, the AI connections, and book export
- Testing: unit tests, end-to-end tests, the key-leak check, and the missing-translation check
- Documents: the Korean and English READMEs, the teacher guide, the key guide, the rights guide, and the record of the AI companies' official documents
- Publishing: the GitHub repository and GitHub Pages

## Where the instruction file and today's code differ

The instruction file is from the first build, so some parts differ from today's code. It is kept as it was. For example:

- The instruction file covers Google Gemini keys only. Support for Claude and OpenAI keys was added later.
- The file paths in it (`design/`, `agents-setup/`) are from the first folder layout.

For how the tool works today, see the code, [`docs/DECISIONS.ko.md`](../DECISIONS.ko.md), and [`docs/PROVIDER_NOTES.md`](../PROVIDER_NOTES.md).
