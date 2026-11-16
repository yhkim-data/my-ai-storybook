// README와 docs/ 안의 상대 경로 링크와 그림이 모두 실제 파일을 가리키는지 본다. 하나라도 없으면 실패한다. (npm run check:links)
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

/** 검사할 문서: 맨 위의 Markdown 파일과 docs/ 아래 Markdown 파일 */
const DOC_PATTERN = /^([^/]+\.md|docs\/.+\.md)$/;
/** 링크와 그림 주소를 찾는 모양: [글](주소), ![글](주소), src="주소", href="주소" */
const LINK_PATTERNS = [/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, /\b(?:src|href)="([^"]+)"/g];
/** 바깥 주소처럼 파일이 아닌 것 (http, mailto, 쪽 안 이동) */
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|#)/i;

/**
 * git이 관리하거나 관리하게 될 문서 목록을 돌려준다 (.gitignore에 든 것은 뺀다).
 */
function list_docs() {
  const output = execSync('git ls-files -co --exclude-standard', { encoding: 'utf8' });
  return output.split('\n').filter((line) => DOC_PATTERN.test(line));
}

/**
 * 코드 블록과 `코드` 안의 글은 링크가 아니므로 지운다.
 */
function strip_code(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/**
 * 문서 하나에서 깨진 상대 경로 링크를 찾는다.
 */
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

/**
 * 모든 문서를 검사하고 결과를 알린다.
 */
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
