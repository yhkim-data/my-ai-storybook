// Type declarations so tests can import check-links.mjs.

export interface BrokenLink {
  doc: string;
  target: string;
}

/** True for top-level Markdown files and Markdown files under docs/. */
export function is_doc_path(path: string): boolean;

/** Finds relative links in one document that point to missing files. `exists` can be replaced in tests. */
export function find_broken_links(doc_path: string, text: string, exists?: (path: string) => boolean): BrokenLink[];

/** The provider usage page addresses, and those that are not https. */
export function read_provider_pages(text?: string): { urls: string[]; not_https: string[] };

/** 'gone' for 404 and 410, 'ok' for any other HTTP status. */
export function judge_status(status: number): 'gone' | 'ok';
