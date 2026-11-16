// Checks that ko.json and en.json have the same keys and placeholders, that every key used in code
// exists, and that UI text avoids jargon. (npm run check:i18n)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const I18N_DIR = 'src/i18n';
const SOURCE_DIR = 'src';
/** Jargon that must not appear in text shown to students. */
const BANNED_WORDS = ['프롬프트', 'API', '토큰', '모델', 'prompt', 'token', 'model'];
/** Matches t('key') or translate(lang, 'key'). */
const KEY_USAGE_PATTERN = /\bt\(\s*'([a-z0-9_.-]+)'|translate\([^,]+,\s*'([a-z0-9_.-]+)'/gi;
const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

function read_table(lang) {
  return JSON.parse(readFileSync(join(I18N_DIR, `${lang}.json`), 'utf8'));
}

/** Lists .ts/.tsx source files under dir, skipping test files. */
function list_source_files(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...list_source_files(path));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) files.push(path);
  }
  return files;
}

/** Returns the {name} placeholders as a sorted, comma-joined string for comparison. */
function placeholders_of(text) {
  return [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]).sort().join(',');
}

/** Runs all checks and returns the list of problems (empty means pass). */
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
