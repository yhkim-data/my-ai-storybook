# How to get a key

**English** | [한국어](key-guide.ko.md)

An API key is a personal access string for an AI provider's service. You can finish a book without one.

## Choosing a provider

You can use a key from any of three providers. The app reads the start of the key and detects which provider it belongs to.

| Provider | Text | Images | Approx. cost per book | Where to get a key |
|---|---|---|---|---|
| No AI connection | Written by you | Uploaded by you | Free | Not needed |
| Google Gemini (free tier) | Yes | No | Free (within Google's usage limits) | <https://aistudio.google.com/apikey> |
| Google Gemini (billing enabled) | Yes | Yes | About US$0.31 (incl. 9 images) | <https://aistudio.google.com/apikey> |
| Claude | Yes | No | About US$0.002 for text (images separate) | <https://platform.claude.com/settings/keys> |
| OpenAI | Yes | Yes | Not available (per-image price not published) | <https://platform.openai.com/api-keys> |

- The free tier applies to Google AI Studio keys without billing. Google sets the usage limits.
- On the free tier, the content you enter and the AI's responses may be used to improve Google's products and may be read by human reviewers (Gemini API terms, checked 2026-11-14). Do not enter personal information such as real names, addresses, or phone numbers.
- Gemini cannot be used in classes with students. See [Who can get a key](#who-can-get-a-key) below and the [teacher guide](teacher-guide.en.md).
- Without a key, the AI features do not work. No key or money from the tool's operator is ever used.

For personal use, the simplest way to start is to try writing with the Gemini free tier. Before using the tool with students, read the notes in the [teacher guide](teacher-guide.en.md).

- Claude writes text only. With only a Claude key, upload your own images, or enter a separate image key (Gemini or OpenAI) in [More settings].
- If you enter a Claude key in the [Key for pictures] box, the app shows "A Claude key cannot make pictures."

## Who can get a key

Each provider has its own age rule. (Checked 2026-11-14)

- **Google Gemini:** Only people 18 or older can get a key.
  - The terms say: "You must be 18 years of age or older to use the APIs."
  - Students under 18 cannot get a key.
  - The terms also prohibit connecting it to a service used by people under 18. Gemini therefore cannot be connected on devices or in classes where students use the tool.
- **Claude (Anthropic):** Allowed with conditions. For people under 18 to use it, the adult or organization that holds the key must provide age checks, content filtering, monitoring and reporting, and guidance on safe use. Anthropic's Commercial Terms of Service, which cover API keys and the Console, have no age clause for the key holder (checked 2026-11-14). The 18-or-older rule is in the Consumer Terms (effective 2025-10-08), which cover personal services such as Claude.ai.
- **OpenAI:** Allowed with conditions. For people under 18 to use it, the organization that holds the key must have safeguards in place and obtain consent from a parent or legal guardian (Services Agreement, Korean edition, checked 2026-11-14).
- This tool has no age check and no monitoring or reporting system. In classes with students, the default is to use it without an AI connection.
- The original wording and how to decide are in the [teacher guide](teacher-guide.en.md).

## Getting a key

On the app's start screen, press [Connect AI]. The same steps appear there.

1. **Open the key page.** Press the button for the provider you want (Google Gemini, Claude, or OpenAI) to open it in a new window, or go to the address in the table above. Sign in with an account for that provider.
2. **Create and copy a key.** Press the button for creating a key (its label includes "Create" and "key") and copy the long string that appears.
3. **Paste it into the app.** Paste it into the [My key] box on the [Connect AI] screen and press [Check connection].

![Connect AI screen](images/en/connect.png)

When you see "Connected to {company name}. Key ends with ····" followed by the last 4 characters, the key is connected. Only the last 4 characters are shown on screen.

[Check connection] only checks that the key is valid. It does not generate any text or images, so text or images can still fail after a successful check if billing is not set up.

## Cost

Prices were checked in each provider's official documentation on 2026-11-14. The full record is in [PROVIDER_NOTES](PROVIDER_NOTES.md) (Korean). All prices are per 1 million tokens; a token is the unit AI uses to measure text.

| Provider | Default text AI | Text price (input / output) | Images | Free tier |
|---|---|---|---|---|
| Google Gemini | `gemini-3.5-flash-lite` | $0.30 / $2.50 | $0.0336 per image | Text only. See Google AI Studio for usage limits. |
| Claude | `claude-haiku-5-5` | $0.10 / $0.50 | Not supported | None |
| OpenAI | `gpt-6-luna` | $0.10 / $0.50 | $30 per 1 million image output tokens (per-image price not published) | Not stated in the documentation |

Other text AI options are available.

- Claude: `claude-sonnet-5-5` ($2 / $10), `claude-opus-5-5` ($4 / $20)
- OpenAI: `gpt-6.1-terra` ($1 / $5), `gpt-6.1-sol` ($2 / $10)

| Task | When it costs money |
|---|---|
| Plot ideas and page text (text) | Gemini: beyond the free tier. Claude and OpenAI: every request |
| Making images | Gemini: $0.0336 per image. OpenAI: see the table above. Claude does not make images. |
| Add my picture | Free (no AI used) |
| Copy picture note | Free (other AI services follow their own terms) |

- With Gemini, 9 images (1 cover and 8 pages) cost $0.3024, or about US$0.31 per book.
- Claude writes text only. The text for one book costs about US$0.002 (default AI, 2 text requests, about 2,000 input tokens and 4,000 output tokens). Images cost extra, or nothing if you upload your own.
- The cost of a book with OpenAI could not be calculated because the per-image price is not published.
- Gemini's daily limit resets at midnight Pacific Time.
- Anthropic's Commercial Terms of Service state: "Anthropic may not train models on Customer Content from Services." (checked 2026-11-16). Under OpenAI's Services Agreement, OpenAI does not use customer content to develop or improve its services unless the customer explicitly agrees (checked 2026-11-16). With any provider, do not enter real names, addresses, or phone numbers.

## A separate key for images

You can use the same key for text and images. If you enter only one key, it is used for both. A Claude key cannot make images, so add a separate image key when you use one.

Add a separate image key when:

- you write with a Claude key and want Gemini or OpenAI to make the images, or
- you have another key that you want to use only for images.

To add it:

1. On the [Connect AI] screen, open [More settings (separate key for pictures, change the kind of AI)].
2. Paste a Gemini or OpenAI key into the [Key for pictures] box. If you leave it empty, the main key is used.
3. Press [Check picture key].

The options for changing the AI are in the same place. The available options depend on the provider of your text key. If you are not sure, leave them as they are. To restore the defaults, press [Back to the first values].

## Keep your key private

- Anyone who knows your key can use AI on your account.
- If someone else uses a key with billing enabled, you may be charged.
- Do not share your key in messages, email, online forums, or screenshots.
- If someone else learns your key, delete it on the key page (addresses in the table above) and create a new one.

This tool saves the key only in this device's browser (localStorage). It sends the key only to the provider that issued it (Google, Anthropic, or OpenAI), and only when AI is used. It is never sent anywhere else.

## Shared devices

On a shared device such as a school computer, press [Erase the key from this device] on the [Connect AI] screen when you finish. The message "The key was erased from this device." confirms it.

## Troubleshooting

Messages you may see on screen, and what to do.

| Message on screen | What to do |
|---|---|
| "That key doesn't match. Shall we copy it again?" | Copy the whole key again and check that no spaces were added at either end. If it still fails, create a new key. |
| "You've used all of today's turns. You can use it again from {time}." | The daily limit has been reached. Try again after the time shown. Meanwhile, you can write the text and upload images yourself. |
| "Let's try again in a little while. Press [Try again] after {seconds} seconds." | Too many requests were sent in a short time. Press [Try again] after the time shown. |
| "This key can't make that. Pictures need a key that is paid for. You can press [Add my picture] instead." | The key has no billing set up. Gemini images, Claude, and OpenAI require a key with billing. Set up billing, or upload your own image with [Add my picture]. |
| "We can't make it with these words. Shall we try different words?" | The AI declined for safety reasons. Reword the picture note or the story and try again. |
| "The key looks right, but the Claude organization that made it has browser use turned off in its settings. Ask the person who manages the organization to turn it on, or put in a different key." | The Claude organization's settings block requests made directly from a browser. The key itself is valid. Ask the organization's admin to change the setting, or use a different key. |

{time} and {seconds} are replaced with the actual time and number of seconds.

If this happens while making a book, the app shows "The Claude organization that made this key has browser use turned off in its settings. Ask the person who manages the organization to turn it on, or put in a different key at [Connect AI]." In this case Claude returns status 401 with "CORS requests are not allowed for this Organization". A 401 without that message is shown as "That key doesn't match".

Other cases:

- If you see "The internet seems to be off.", check your connection and press [Check connection] or [Try again].
- If you see "We can't check right now.", press [Check connection] again after a moment.
- To practice without a key, add `?mock=1` to the end of the app address. Sample stories and images are provided.
