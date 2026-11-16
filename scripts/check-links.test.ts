// 링크 검사 스크립트의 검사: 상대 경로만 보고, 바깥 주소와 코드 안의 글은 건너뛴다.
import { normalize } from 'node:path';
import { describe, expect, it } from 'vitest';
import { find_broken_links } from './check-links.mjs';

/** 있다고 칠 파일들 */
const FILES = new Set([normalize('docs/images/ko/start.png'), normalize('docs/key-guide.ko.md')]);

/** 가짜 파일 확인: FILES 안에 있으면 있다고 본다. */
function fake_exists(path: string): boolean {
  return FILES.has(normalize(path));
}

describe('find_broken_links', () => {
  it('있는 파일을 가리키는 링크와 그림은 통과한다', () => {
    const text = '![시작](docs/images/ko/start.png) [키](docs/key-guide.ko.md#키-받기) <img src="docs/images/ko/start.png">';
    expect(find_broken_links('README.md', text, fake_exists)).toEqual([]);
  });

  it('문서가 있는 폴더를 기준으로 경로를 푼다', () => {
    expect(find_broken_links('docs/key-guide.en.md', '![a](images/ko/start.png)', fake_exists)).toEqual([]);
  });

  it('없는 파일을 가리키면 찾아낸다', () => {
    expect(find_broken_links('README.md', '![a](docs/images/old.png)', fake_exists)).toEqual([{ doc: 'README.md', target: 'docs/images/old.png' }]);
  });

  it('바깥 주소, 쪽 안 이동, 코드 안의 글은 건너뛴다', () => {
    const text = '[a](https://di-lab.io/) [b](#위로) [c](mailto:x@example.com) `[d](no.md)`\n```\n[e](no.md)\n```';
    expect(find_broken_links('README.md', text, fake_exists)).toEqual([]);
  });
});
