# How to get a key

**English** | [한국어](key-guide.ko.md)

A key is like your own password for using AI. You can finish a book without one.

## Which company's key should I get?

You can use a key from any of three companies. The app looks at the start of the key and works out which company it is from.

| Company | Words | Pictures | Cost | Where to get a key |
|---|---|---|---|---|
| Google Gemini | Yes | Yes | Words have a free limit. Pictures need a paid key. | https://aistudio.google.com/apikey |
| Claude (Anthropic) | Yes | **No** | No free limit. You need a paid key. | https://platform.claude.com/settings/keys |
| OpenAI | Yes | Yes | A free limit is not in the documents. | https://platform.openai.com/api-keys |

- **If you are not sure, choose Google Gemini.**
- Claude writes words only. With only a Claude key, add your own pictures, or enter a separate key for pictures (Gemini or OpenAI) in [More settings].
- If you put a Claude key in the [Key for pictures] box, the app says "A Claude key cannot make pictures."

## Who can get a key?

Each company has its own age rule. (Checked: 2026-11-14)

- **Google Gemini:** Only people 18 or older can get a key. This is a condition in Google's terms.
  - The terms say: "You must be 18 years of age or older to use the APIs."
  - Students (under 18) cannot get a key.
  - The terms also do not allow connecting it to a service that people under 18 use. So on devices and in classes where students use the tool, the Gemini connection cannot be turned on.
- **Claude (Anthropic):** It is not banned, but there are conditions. For people under 18 to use it, the adult or organization that got the key must have an age check, content filtering, a way to watch and report problems, and guidance on safe use. The age of the person who gets a key: Anthropic's Commercial Terms of Service, which cover keys and the Console, have no age clause (checked 2026-11-14). The 18-or-older rule is in the Consumer Terms (effective 2025-10-08), which cover personal services such as Claude.ai.
- **OpenAI:** It is not banned, but there are conditions. For people under 18 to use it, the organization that got the key must have safeguards in place. We could not check the age clause in OpenAI's terms of service (the terms pages were blocked with HTTP 403). A person must open and read them.
- This tool does not have an age check or a way to watch and report problems. So in a class with students, using it without an AI connection is the basic way.
- The original text and what a teacher should weigh are in the [teacher guide](teacher-guide.en.md).

## Steps to get a key

On the start screen of the app, press [Connect AI]. The same steps are shown there.

1. **Open the key page.** Press the button for the company you want (Google Gemini, Claude, or OpenAI) and a new window opens. To open it yourself, go to the address in the table above. You need to sign in with an account from that company.
2. **Make a key and copy it.** Press the button that says Create and key. Copy the long text that appears.
3. **Paste it into the app.** Paste it in the [My key] box on the [Connect AI] screen and press [Check connection].

![Connect AI screen](images/connect.png)

If you see "Connected to {company name}. Key ends with ····" and the last 4 characters, it worked. The screen shows only the last 4 characters.

[Check connection] only checks that the key is accepted. It does not try to make any words or pictures. So even when it says "Connected", words or pictures may fail if billing is not set up.

## What is free and what costs money

Prices were checked in each company's official documents on 2026-11-14. The full record is in [PROVIDER_NOTES](PROVIDER_NOTES.md), which is written in Korean. All prices are per 1 million tokens. A token is the unit AI uses to count words.

| Company | Default AI type for words | Price for words (input / output) | Pictures | Free limit |
|---|---|---|---|---|
| Google Gemini | `gemini-3.5-flash-lite` | $0.30 / $2.50 | $0.0336 per picture | For words only. Check Google AI Studio for the number of uses. |
| Claude | `claude-haiku-5-5` | $0.10 / $0.50 | Does not make pictures | None |
| OpenAI | `gpt-6-luna` | $0.10 / $0.50 | $30 per 1 million picture output tokens (the price per picture is not in the documents) | Not in the documents |

Other kinds of AI for words can be chosen too.

- Claude: `claude-sonnet-5-5` ($2 / $10), `claude-opus-5-5` ($4 / $20)
- OpenAI: `gpt-6.1-terra` ($1 / $5), `gpt-6.1-sol` ($2 / $10)

| What you do | When it costs money |
|---|---|
| Plot ideas and page text (writing) | Gemini: when you go over the free limit. Claude and OpenAI: every time you use them |
| Making pictures | Gemini: $0.0336 per picture. OpenAI: see the table above. Claude does not make pictures. |
| Add my picture | Free (no AI used) |
| Copy picture note | Free (the other AI app has its own terms) |

- With Gemini, 9 pictures (1 cover and 8 pages) cost $0.3024. One book costs about 0.31 US dollars.
- Claude writes words only, so the words of one book cost about 0.002 US dollars (default type, 2 writing calls, about 2 thousand input tokens and about 4 thousand output tokens). Pictures cost extra. They are free if you add your own.
- We could not work out the cost of one book with OpenAI, because the price of one picture is not in the documents.
- Gemini's daily limit resets at midnight Pacific time.
- When you use Gemini's free limit, what you type is used by Google to improve its services, and people may read it. Do not write real names, addresses, or phone numbers.
- We did not check how Claude and OpenAI use what you type this time. With any company, do not write real names, addresses, or phone numbers.

## A separate key for pictures

You can use the same key for words and pictures. If you enter only one key, it is used for both. A Claude key cannot make pictures, so enter a separate key for pictures.

Enter a separate key for pictures when:

- you write with a Claude key and want Gemini or OpenAI to make the pictures, or
- you have another key just for pictures.

Do this.

1. On the [Connect AI] screen, open [More settings (separate key for pictures, change the kind of AI)].
2. Paste a Gemini or OpenAI key in the [Key for pictures] box. If you leave it empty, the key above is used too.
3. Press [Check picture key].

The boxes for changing the kind of AI are in the same place. The choices change to match the company of your key for words. Not sure? Leave them as they are. To go back to the first values, press [Back to the first values].

## Why you must not show your key to others

- Anyone who knows your key can use AI on your account.
- A key that costs money can leave you with a bill when someone else uses it.
- Do not post your key in messages, email, online boards, or screenshots.
- If someone else learns your key, delete that key where you got it (the addresses in the table above) and make a new one.

This tool saves the key only in the browser on this device (localStorage). It sends the key only to the company the key belongs to (Google, Anthropic, or OpenAI), and only when AI is called. It sends it nowhere else.

## On a shared device

On a shared device such as a school computer, press [Erase the key from this device] on the [Connect AI] screen when you finish. When you see "The key was erased from this device.", it is done.

## When it does not work

These are the messages you may see on the screen, and what to do.

| Message on screen | What to do |
|---|---|
| "That key doesn't match. Shall we copy it again?" | Copy the key again from the first character to the last. Check that no spaces came along. If it still fails, make a new key. |
| "You've used all of today's turns. You can use it again from {time}." | The daily limit is used up. Try again after the time shown on the screen. Meanwhile you can write the words yourself and add your own pictures. |
| "Let's try again in a little while. Press [Try again] after {seconds} seconds." | Too many requests came in a short time. Press [Try again] after the seconds shown. |
| "This key can't make that. Pictures need a key that is paid for. You can press [Add my picture] instead." | The key is not set up to pay. Gemini pictures, Claude, and OpenAI need a key that is paid for. Connect billing, or press [Add my picture] and add your own. |
| "We can't make it with these words. Shall we try different words?" | The AI did not make it for safety reasons. Change the picture note or the story words and try again. |
| "The key looks right, but the Claude organization that made it has browser use turned off in its settings. Ask the person who manages the organization to turn it on, or put in a different key." | The Claude organization's setting blocks calls straight from the browser. The key is not wrong. Ask the person who manages the organization to turn it on, or put in a different key. |

{time} and {seconds} are replaced by the real time and seconds on the screen.

While making a book, the same problem shows as "The Claude organization that made this key has browser use turned off in its settings. Ask the person who manages the organization to turn it on, or put in a different key at [Connect AI]." In that case Claude answers with 401 and "CORS requests are not allowed for this Organization". A 401 without those words still shows as "That key doesn't match".

Other things to try.

- If you see "The internet seems to be off.", check your connection and press [Check connection] or [Try again] again.
- If you see "We can't check right now.", press [Check connection] again in a little while.
- To practice without a key, add `?mock=1` to the end of the app address. You get ready-made stories and pictures.
