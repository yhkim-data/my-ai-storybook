// 저장소 전체에서 키처럼 보이는 문자열을 찾는다. 하나라도 있으면 실패한다. (npm run check:secrets)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** 글자로 읽지 않는 파일 */
const BINARY_EXTENSIONS = ['.woff2', '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.ico'];
/** 검사하지 않는 파일 (자동으로 만들어지는 해시가 가득하다) */
const SKIPPED_FILES = ['package-lock.json'];
/** 커밋하면 안 되는 파일 이름 */
const FORBIDDEN_FILE = /(^|\/)\.env(\..+)?$/;

/** 키처럼 보이는 모양들 */
const SECRET_PATTERNS = [
  { name: 'Google 키', pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'sk- 키', pattern: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: 'GitHub 토큰', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'AWS 키', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: '개인 키 파일', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: '코드에 적힌 비밀 값',
    pattern: /(api[_-]?key|secret|password|access[_-]?token)["']?\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{24,}["']/i,
  },
];

/**
 * git이 관리하거나 관리하게 될 파일 목록을 돌려준다 (.gitignore에 든 것은 뺀다).
 */
function list_repo_files() {
  const output = execSync('git ls-files -co --exclude-standard', { encoding: 'utf8' });
  return output.split('\n').filter((line) => line.length > 0);
}

/**
 * 파일 하나에서 키처럼 보이는 줄을 찾는다.
 */
function scan_file(file_path) {
  const findings = [];
  let text;
  try {
    text = readFileSync(file_path, 'utf8');
  } catch {
    return findings;
  }
  text.split('\n').forEach((line, index) => {
    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(line)) findings.push(`${file_path}:${index + 1} ${name}`);
    }
  });
  return findings;
}

/**
 * 저장소 전체를 검사하고 결과를 알린다.
 */
function main() {
  const files = list_repo_files();
  const findings = [];
  for (const file_path of files) {
    if (FORBIDDEN_FILE.test(file_path)) findings.push(`${file_path} .env 파일은 저장소에 넣지 않는다`);
    if (SKIPPED_FILES.includes(file_path)) continue;
    if (BINARY_EXTENSIONS.some((extension) => file_path.toLowerCase().endsWith(extension))) continue;
    findings.push(...scan_file(file_path));
  }
  if (findings.length > 0) {
    console.error('키처럼 보이는 문자열을 찾았습니다:');
    for (const finding of findings) console.error(`  ${finding}`);
    process.exit(1);
  }
  console.log(`키 검사 통과: 파일 ${files.length}개에서 키처럼 보이는 문자열이 없습니다.`);
}

main();
