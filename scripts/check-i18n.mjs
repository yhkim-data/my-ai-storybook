// 번역 빠짐 검사와 쉬운 말 검사. ko.json과 en.json의 항목이 정확히 같은지, 코드가 쓰는 키가 모두 있는지,
// 화면 문구에 어려운 말이 없는지 본다. (npm run check:i18n)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const I18N_DIR = 'src/i18n';
const SOURCE_DIR = 'src';
/** 학생이 보는 화면 문구에 쓰지 않는 말 */
const BANNED_WORDS = ['프롬프트', 'API', '토큰', '모델', 'prompt', 'token', 'model'];
/** 코드에서 번역 키를 쓰는 모양: t('키') 또는 translate(언어, '키') */
const KEY_USAGE_PATTERN = /\bt\(\s*'([a-z0-9_.-]+)'|translate\([^,]+,\s*'([a-z0-9_.-]+)'/gi;
/** 문구 안의 {이름} 자리 */
const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/**
 * 번역 파일을 읽는다.
 */
function read_table(lang) {
  return JSON.parse(readFileSync(join(I18N_DIR, `${lang}.json`), 'utf8'));
}

/**
 * 폴더 아래의 소스 파일을 모두 찾는다 (검사 파일은 뺀다).
 */
function list_source_files(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...list_source_files(path));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) files.push(path);
  }
  return files;
}

/**
 * 문구 안의 {이름} 자리를 정렬된 목록으로 돌려준다.
 */
function placeholders_of(text) {
  return [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]).sort().join(',');
}

/**
 * 모든 검사를 돌리고 문제 목록을 돌려준다.
 */
export function find_i18n_problems() {
  const ko = read_table('ko');
  const en = read_table('en');
  const problems = [];
  for (const key of Object.keys(ko)) if (!(key in en)) problems.push(`en.json에 없는 키: ${key}`);
  for (const key of Object.keys(en)) if (!(key in ko)) problems.push(`ko.json에 없는 키: ${key}`);
  for (const key of Object.keys(ko)) {
    if (key in en && placeholders_of(ko[key]) !== placeholders_of(en[key])) problems.push(`{ } 자리가 다른 키: ${key}`);
  }
  for (const [lang, table] of [['ko', ko], ['en', en]]) {
    for (const [key, text] of Object.entries(table)) {
      if (text.trim().length === 0) problems.push(`${lang}.json 빈 문구: ${key}`);
      for (const word of BANNED_WORDS) {
        if (new RegExp(word, 'i').test(text)) problems.push(`${lang}.json "${word}"가 든 문구: ${key}`);
      }
    }
  }
  for (const file of list_source_files(SOURCE_DIR)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(KEY_USAGE_PATTERN)) {
      const key = match[1] ?? match[2];
      if (key && key.includes('.') && !(key in ko)) problems.push(`${file}가 쓰는 키가 없음: ${key}`);
    }
  }
  return problems;
}

/**
 * 명령줄에서 불렸을 때 결과를 알리고 끝낸다.
 */
function main() {
  const problems = find_i18n_problems();
  if (problems.length > 0) {
    console.error('번역 검사 실패:');
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`번역 검사 통과: ${Object.keys(read_table('ko')).length}개 항목이 두 언어에 똑같이 있고, 어려운 말이 없습니다.`);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/check-i18n.mjs')) main();
