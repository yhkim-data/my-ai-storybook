// AI 연결부(Provider)의 모양. 글과 그림 연결부를 갈아끼울 수 있게 한다.
import type { Lang, PageDraft, Plot, StorySeed, StyleId } from '../types';

/** 오류 종류. 화면 문구는 error.<kind> 번역 키로 고른다. */
export type ProviderErrorKind =
  | 'blocked'
  | 'quota_daily'
  | 'rate'
  | 'network'
  | 'bad_key'
  | 'no_permission'
  | 'unknown';

/** 연결부가 던지는 오류. retry_at은 다시 해 볼 수 있는 시각(ms)이다. */
export class ProviderError extends Error {
  kind: ProviderErrorKind;
  retry_at: number | null;

  /**
   * 오류 종류와 다시 시도할 수 있는 시각으로 오류를 만든다.
   */
  constructor(kind: ProviderErrorKind, retry_at: number | null = null, detail = '') {
    super(detail || kind);
    this.name = 'ProviderError';
    this.kind = kind;
    this.retry_at = retry_at;
  }
}

/** 연결 확인 결과 */
export type ConnectionResult = { ok: true } | { ok: false; reason: ProviderErrorKind };

/** 그림 한 장을 만들어 달라는 요청 */
export interface ImageRequest {
  /** 이 쪽의 그림 설명 */
  description: string;
  style_id: StyleId;
  /** 주인공 카드: 겉모습을 묘사한 고정 문장 */
  hero_card: string;
  /** 참고 그림 (data URL). 연결부가 지원할 때만 쓴다. */
  reference_image: string | null;
  /** 0은 표지, 1부터 본문 */
  page_index: number;
  lang: Lang;
}

/** 글 연결부 */
export interface TextProvider {
  id: string;
  /** 줄거리 3개를 제안한다. */
  suggestPlots(seed: StorySeed, lang: Lang): Promise<Plot[]>;
  /** 쪽별 글과 그림 설명을 한꺼번에 만든다. */
  splitIntoPages(plot: Plot, seed: StorySeed, lang: Lang): Promise<PageDraft[]>;
  testConnection(): Promise<ConnectionResult>;
}

/** 그림 연결부 */
export interface ImageProvider {
  id: string;
  /** 책 마지막 쪽 AI 표시에 쓰는 이름 */
  model_name: string;
  supportsReferenceImage: boolean;
  generate(req: ImageRequest): Promise<Blob>;
  testConnection(): Promise<ConnectionResult>;
}
