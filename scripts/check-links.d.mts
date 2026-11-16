// Type declarations so tests can import check-links.mjs.

export interface BrokenLink {
  doc: string;
  target: string;
}

/** True for top-level Markdown files and Markdown files under docs/. */
export function is_doc_path(path: string): boolean;

/** Finds relative links in one document that point to missing files. `exists` can be replaced in tests. */
export function find_broken_links(doc_path: string, text: string, exists?: (path: string) => boolean): BrokenLink[];
