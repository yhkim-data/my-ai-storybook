// check-links.mjs의 타입 선언. 검사 코드가 이 스크립트를 불러 쓸 수 있게 한다.

/** 깨진 링크 하나 */
export interface BrokenLink {
  doc: string;
  target: string;
}

/** 검사할 문서 경로인지 본다 (맨 위 Markdown 파일과 docs/ 아래 Markdown 파일). */
export function is_doc_path(path: string): boolean;

/** 문서 하나에서 없는 파일을 가리키는 상대 경로 링크를 찾는다. exists로 파일이 있는지 보는 방법을 바꿀 수 있다. */
export function find_broken_links(doc_path: string, text: string, exists?: (path: string) => boolean): BrokenLink[];
