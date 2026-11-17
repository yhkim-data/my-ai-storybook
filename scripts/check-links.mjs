// Checks that every relative link and image in README files and docs/ points to an existing file, and that the
// provider usage pages the app links to still answer. (npm run check:links)
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

/** Top-level Markdown files and Markdown files under docs/. */
const DOC_PATTERN = /^([^/]+\.md|docs\/.+\.md)$/;
/** Matches [text](url), ![alt](url), src="url" and href="url". */
const LINK_PATTERNS = [/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, /\b(?:src|href)="([^"]+)"/g];
/** Provider usage pages linked from the app's "AI usage" panel. */
const PROVIDER_PAGES_FILE = 'src/providers/provider_pages.json';
const EXTERNAL_TIMEOUT_MS = 15000;
/** A page that answers with one of these is gone. Sign-in redirects (3xx) and sign-in walls (401, 403) are fine. */
const GONE_STATUSES = [404, 410];

/** Not a file: any URL scheme (http:, mailto:) or an in-page anchor. */
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|#)/i;

/** True for top-level Markdown files (README.md, README.kr.md, ...) and Markdown files under docs/. */
export function is_doc_path(path) {
  return DOC_PATTERN.test(path);
}

/** Tracked and untracked docs, excluding anything in .gitignore. */
function list_docs() {
  const output = execSync('git ls-files -co --exclude-standard', { encoding: 'utf8' });
  return output.split('\n').filter(is_doc_path);
}

/** Text inside code blocks and inline code is not a link, so remove it first. */
function strip_code(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/** Finds relative links in one document that point to missing files. */
export function find_broken_links(doc_path, text, exists = existsSync) {
  const broken = [];
  const body = strip_code(text);
  for (const pattern of LINK_PATTERNS) {
    for (const match of body.matchAll(pattern)) {
      const target = match[1];
      if (EXTERNAL.test(target)) continue;
      const file_part = decodeURIComponent(target.split('#')[0].split('?')[0]);
      if (file_part.length === 0) continue;
      const resolved = normalize(join(dirname(doc_path), file_part));
      if (!exists(resolved)) broken.push({ doc: doc_path, target });
    }
  }
  return broken;
}

/** The usage page addresses the app links to; every one must be https. */
export function read_provider_pages(text = readFileSync(PROVIDER_PAGES_FILE, 'utf8')) {
  const urls = Object.values(JSON.parse(text).usage ?? {});
  return { urls, not_https: urls.filter((url) => typeof url !== 'string' || !url.startsWith('https://')) };
}

/** 'gone' for a page that no longer exists, 'ok' for any other answer. */
export function judge_status(status) {
  return GONE_STATUSES.includes(status) ? 'gone' : 'ok';
}

/** Asks each page once. A page that is gone fails the check; no network only prints a warning. */
async function check_provider_pages(urls) {
  const gone = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS) });
      if (judge_status(response.status) === 'gone') gone.push(`${url} (${response.status})`);
    } catch {
      console.warn(`경고: ${url}에 접속하지 못해 확인을 건너뜁니다.`);
    }
  }
  return gone;
}

async function main() {
  const docs = list_docs();
  const broken = docs.flatMap((doc_path) => find_broken_links(doc_path, readFileSync(doc_path, 'utf8')));
  const pages = read_provider_pages();
  const gone = await check_provider_pages(pages.urls);
  if (broken.length > 0 || gone.length > 0 || pages.not_https.length > 0) {
    if (broken.length > 0) console.error(`링크 검사 실패: 없는 파일을 가리키는 링크 ${broken.length}개`);
    for (const item of broken) console.error(`  ${item.doc}: ${item.target}`);
    for (const url of pages.not_https) console.error(`  ${PROVIDER_PAGES_FILE}: https가 아닌 주소 ${url}`);
    for (const url of gone) console.error(`  ${PROVIDER_PAGES_FILE}: 없는 쪽 ${url}`);
    process.exit(1);
  }
  console.log(`링크 검사 통과: 문서 ${docs.length}개의 상대 경로 링크와 그림이 모두 있고, 사용량 화면 주소 ${pages.urls.length}개가 응답합니다.`);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/check-links.mjs')) void main();
