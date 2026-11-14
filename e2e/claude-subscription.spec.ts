// Claude 구독으로 하는 연결 검사: 환경 변수 CLAUDE_BRIDGE=1 일 때만 돈다.
// 앱이 api.anthropic.com 으로 보내는 요청을 가로채서 모양을 확인하고, 답은 이 컴퓨터의 Claude Code(claude -p)로
// 실제 Claude가 만들게 한다. 진짜 서버가 요청을 받아 주는지는 이 검사로 알 수 없다 (그것은 real-api.spec.ts).
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { SETTINGS_KEY, choose_first_plot, exact_button, fill_seed, open_start, start_new_book, tr, type Lang, type PageCount } from './helpers';

const LANG: Lang = 'ko';
/** 검사용 가짜 키. 실제 키가 아니다. 앞머리만 Claude 키 모양이다. */
const FAKE_KEY = ['sk-ant', 'bridge', 'fake', 'A1b2'].join('-');
const FAKE_KEY_TAIL = 'A1b2';
const CLAUDE_ORIGIN = 'https://api.anthropic.com';
/** 이 검사를 돌리는 화면 크기 (실제 Claude를 부르므로 한 번만 돈다) */
const BRIDGE_PROJECT = 'tablet';
/** 줄거리 수와 본문 쪽수 */
const PLOT_COUNT = 3;
const PAGE_COUNT: PageCount = 4;
/** 이 검사에서 기대하는 글 요청 수 (줄거리 1 + 쪽 나누기 1) */
const EXPECTED_MESSAGE_COUNT = 2;
/** claude 명령 한 번을 기다리는 시간(ms)과 검사 전체 시간(ms) */
const CLAUDE_CALL_WAIT_MS = 180_000;
const TEST_TIMEOUT_MS = 480_000;
/** claude 명령 출력 한도(바이트) */
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
/** Claude가 받는 배열 최소 길이 값 */
const ALLOWED_MIN_ITEMS = [0, 1];
/** 가짜 응답에 붙이는 CORS 머리글 */
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*, authorization',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

/** 앱이 보낸 글 요청에서 쓰는 부분 */
interface MessageRequest {
  model?: string;
  max_tokens?: number;
  system?: string;
  messages?: { role?: string; content?: string }[];
  output_config?: { format?: { type?: string; schema?: Record<string, unknown> } };
}

/**
 * claude 실행 파일 위치를 찾는다. 환경 변수 CLAUDE_BIN이 먼저다.
 */
function find_claude_bin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const windows_bin = join(process.env.APPDATA ?? '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  return process.platform === 'win32' && existsSync(windows_bin) ? windows_bin : 'claude';
}

/**
 * 스키마가 Claude 공식 문서의 제한을 지키는지 본다. 어긴 점을 글로 돌려준다.
 */
function find_schema_problems(node: unknown, path = 'schema'): string[] {
  if (Array.isArray(node)) return node.flatMap((item, index) => find_schema_problems(item, `${path}[${index}]`));
  if (typeof node !== 'object' || node === null) return [];
  const record = node as Record<string, unknown>;
  const problems: string[] = [];
  if (record.type === 'object' && record.additionalProperties !== false) problems.push(`${path}: additionalProperties가 false가 아님`);
  if ('maxItems' in record) problems.push(`${path}: maxItems는 받지 않음`);
  if ('minItems' in record && !ALLOWED_MIN_ITEMS.includes(record.minItems as number)) problems.push(`${path}: minItems는 0과 1만 받음`);
  for (const [key, value] of Object.entries(record)) problems.push(...find_schema_problems(value, `${path}.${key}`));
  return problems;
}

/**
 * claude -p 로 실제 Claude에게 묻고, 스키마에 맞춘 답(JSON 글)을 돌려준다.
 */
function ask_claude(model: string, system: string, prompt: string, schema: Record<string, unknown>): Promise<string> {
  const args = ['-p', '--model', model, '--tools', '', '--output-format', 'json', '--system-prompt', system, '--json-schema', JSON.stringify(schema)];
  return new Promise((resolve, reject) => {
    // 이 저장소의 설정 파일을 읽지 않게 임시 폴더에서 돌린다. 물음은 표준 입력으로 준다.
    const child = execFile(find_claude_bin(), args, { cwd: tmpdir(), timeout: CLAUDE_CALL_WAIT_MS, maxBuffer: MAX_OUTPUT_BYTES }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const output = JSON.parse(stdout) as { is_error?: boolean; result?: string; structured_output?: unknown };
      if (output.is_error || output.structured_output === undefined) reject(new Error(`claude 명령이 답을 주지 않음: ${output.result ?? ''}`));
      else resolve(JSON.stringify(output.structured_output));
    });
    child.stdin?.end(prompt);
  });
}

/**
 * api.anthropic.com 으로 가는 요청을 가로채는 다리를 놓는다. 받은 글 요청과 찾은 문제를 돌려준다.
 */
async function install_claude_bridge(page: Page): Promise<{ message_requests: MessageRequest[]; problems: string[] }> {
  const message_requests: MessageRequest[] = [];
  const problems: string[] = [];
  await page.route(`${CLAUDE_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    const headers = await request.allHeaders();
    // SDK는 키를 x-api-key 또는 Authorization 머리글에 싣는다.
    const has_key = headers['x-api-key'] === FAKE_KEY || headers.authorization === `Bearer ${FAKE_KEY}`;
    if (!has_key) problems.push(`${url.pathname}: 키 머리글이 다름`);
    if (!headers['anthropic-version']) problems.push(`${url.pathname}: anthropic-version 머리글 없음`);
    if (headers['anthropic-dangerous-direct-browser-access'] !== 'true') problems.push(`${url.pathname}: 브라우저 직접 호출 머리글 없음`);
    const json = (data: unknown) => route.fulfill({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(data) });

    if (request.method() === 'GET' && url.pathname === '/v1/models') {
      await json({ data: [], has_more: false, first_id: null, last_id: null });
      return;
    }
    if (request.method() === 'POST' && url.pathname === '/v1/messages') {
      const body = JSON.parse(request.postData() ?? '{}') as MessageRequest;
      message_requests.push(body);
      const format = body.output_config?.format;
      const prompt = body.messages?.[0]?.content;
      if (format?.type !== 'json_schema' || !format.schema) problems.push('output_config.format이 json_schema가 아님');
      if (typeof body.max_tokens !== 'number') problems.push('max_tokens 없음');
      if (body.messages?.length !== 1 || body.messages[0]?.role !== 'user' || typeof prompt !== 'string') problems.push('messages 모양이 다름');
      problems.push(...find_schema_problems(format?.schema));
      const text = await ask_claude(body.model ?? '', body.system ?? '', prompt ?? '', format?.schema ?? {});
      await json({
        id: 'msg_bridge',
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [{ type: 'text', text }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      });
      return;
    }
    problems.push(`예상하지 못한 요청: ${request.method()} ${url.pathname}`);
    await route.fulfill({ status: 404, headers: CORS_HEADERS, contentType: 'application/json', body: '{}' });
  });
  return { message_requests, problems };
}

test('Claude 구독 다리: 키 확인부터 줄거리와 쪽 글까지 실제 Claude의 답으로 채워진다', async ({ page }, test_info) => {
  test.skip(process.env.CLAUDE_BRIDGE !== '1', '환경 변수 CLAUDE_BRIDGE=1 이 없어서 Claude 구독 검사를 건너뜁니다');
  test.skip(test_info.project.name !== BRIDGE_PROJECT, '실제 Claude를 부르는 검사는 한 화면 크기에서만 돕니다');
  test.setTimeout(TEST_TIMEOUT_MS);
  const bridge = await install_claude_bridge(page);

  // 1) 연결 화면에서 Claude 모양 키를 확인한다.
  await open_start(page, LANG);
  await page.locator('.start-connect-btn').click();
  await page.locator('#key-input').fill(FAKE_KEY);
  await exact_button(page, tr(LANG, 'connect.check')).click();
  await expect(page.getByText(tr(LANG, 'connect.ok', { name: 'Claude', tail: FAKE_KEY_TAIL }))).toBeVisible();
  await expect(page.getByText(tr(LANG, 'connect.no_image'))).toBeVisible();
  const saved_key = await page.evaluate((settings_key) => (JSON.parse(localStorage.getItem(settings_key) ?? '{}') as { text_key?: string }).text_key, SETTINGS_KEY);
  expect(saved_key).toBe(FAKE_KEY);
  await page.locator('.side-back').click();

  // 2) 줄거리 3개를 실제 Claude가 만든다.
  await start_new_book(page, LANG);
  await fill_seed(page, LANG, { page_count: PAGE_COUNT });
  const cards = page.locator('button.card.selectable');
  await expect(cards).toHaveCount(PLOT_COUNT, { timeout: CLAUDE_CALL_WAIT_MS });
  await expect(page.getByRole('alert')).toHaveCount(0);
  const first_plot = (await cards.first().innerText()).trim();
  expect(first_plot.length).toBeGreaterThan(0);

  // 3) 쪽 나누기도 실제 Claude가 만든다. 쪽마다 글이 있어야 한다.
  await choose_first_plot(page, LANG);
  for (let page_number = 1; page_number <= PAGE_COUNT; page_number += 1) {
    const field = page.locator(`#page-text-${page_number}`);
    await expect(field).toBeVisible({ timeout: CLAUDE_CALL_WAIT_MS });
    await expect(field).not.toHaveValue('', { timeout: CLAUDE_CALL_WAIT_MS });
  }
  await expect(page.getByRole('alert')).toHaveCount(0);

  // 4) 앱이 보낸 요청 모양에 문제가 없어야 한다.
  expect(bridge.problems).toEqual([]);
  expect(bridge.message_requests).toHaveLength(EXPECTED_MESSAGE_COUNT);
  test_info.annotations.push({ type: 'claude-model', description: bridge.message_requests[0]?.model ?? '' });
  test_info.annotations.push({ type: 'first-plot', description: first_plot.replace(/\s+/g, ' ') });
});
