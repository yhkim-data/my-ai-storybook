// Checks that every relative link and image in README files and docs/ points to an existing file. (npm run check:links)
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

/** Top-level Markdown files and Markdown files under docs/. */
const DOC_PATTERN = /^([^/]+\.md|docs\/.+\.md)$/;
/** Matches [text](url), ![alt](url), src="url" and href="url". */
const LINK_PATTERNS = [/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, /\b(?:src|href)="([^"]+)"/g];
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

function main() {
  const docs = list_docs();
  const broken = docs.flatMap((doc_path) => find_broken_links(doc_path, readFileSync(doc_path, 'utf8')));
  if (broken.length > 0) {
    console.error(`링크 검사 실패: 없는 파일을 가리키는 링크 ${broken.length}개`);
    for (const item of broken) console.error(`  ${item.doc}: ${item.target}`);
    process.exit(1);
  }
  console.log(`링크 검사 통과: 문서 ${docs.length}개의 상대 경로 링크와 그림이 모두 있습니다.`);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/check-links.mjs')) main();
