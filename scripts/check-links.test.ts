import { normalize } from 'node:path';
import { describe, expect, it } from 'vitest';
import { find_broken_links, is_doc_path, judge_status, read_provider_pages } from './check-links.mjs';

/** Files treated as existing. */
const FILES = new Set([normalize('docs/images/ko/start.png'), normalize('docs/key-guide.ko.md')]);

function fake_exists(path: string): boolean {
  return FILES.has(normalize(path));
}

describe('find_broken_links', () => {
  it('passes links and images that point to existing files', () => {
    const text = '![시작](docs/images/ko/start.png) [키](docs/key-guide.ko.md#키-받기) <img src="docs/images/ko/start.png">';
    expect(find_broken_links('README.md', text, fake_exists)).toEqual([]);
  });

  it('resolves paths relative to the document folder', () => {
    expect(find_broken_links('docs/key-guide.en.md', '![a](images/ko/start.png)', fake_exists)).toEqual([]);
  });

  it('reports links to missing files', () => {
    expect(find_broken_links('README.md', '![a](docs/images/old.png)', fake_exists)).toEqual([{ doc: 'README.md', target: 'docs/images/old.png' }]);
  });

  it('skips external URLs, in-page anchors and text inside code', () => {
    const text = '[a](https://di-lab.io/) [b](#위로) [c](mailto:x@example.com) `[d](no.md)`\n```\n[e](no.md)\n```';
    expect(find_broken_links('README.md', text, fake_exists)).toEqual([]);
  });
});

describe('is_doc_path', () => {
  it('checks all three READMEs and Markdown files under docs/', () => {
    for (const path of ['README.md', 'README.kr.md', 'README.en.md', 'docs/rights.ko.md', 'docs/releases/v1.0.0.md']) {
      expect(is_doc_path(path)).toBe(true);
    }
  });

  it('skips non-Markdown files and Markdown files outside docs/', () => {
    for (const path of ['index.html', 'src/notes.md', 'docs/images/ko/demo.gif']) {
      expect(is_doc_path(path)).toBe(false);
    }
  });
});

describe('provider usage pages', () => {
  it('reads the addresses and flags any that are not https', () => {
    const pages = read_provider_pages(JSON.stringify({ usage: { a: 'https://a.example/usage', b: 'http://b.example/usage' } }));
    expect(pages.urls).toHaveLength(2);
    expect(pages.not_https).toEqual(['http://b.example/usage']);
    expect(read_provider_pages().not_https).toEqual([]);
  });

  it('only a missing page fails; sign-in redirects and walls are fine', () => {
    expect(judge_status(404)).toBe('gone');
    expect(judge_status(410)).toBe('gone');
    for (const status of [200, 302, 401, 403]) expect(judge_status(status)).toBe('ok');
  });
});
