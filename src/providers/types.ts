// Provider interfaces, so text and image providers can be swapped.
import type { ArtStyle, Lang, PageDraft, Plot, StorySeed } from '../types';

/** The on-screen message comes from the error.<kind> translation key. */
export type ProviderErrorKind =
  | 'blocked'
  | 'quota_daily'
  | 'rate'
  | 'network'
  | 'bad_key'
  | 'no_permission'
  /** The key is valid but the organization has disabled browser access. */
  | 'browser_blocked'
  | 'unknown';

/** Error thrown by providers. retry_at is when the user may try again (epoch ms). */
export class ProviderError extends Error {
  kind: ProviderErrorKind;
  retry_at: number | null;

  constructor(kind: ProviderErrorKind, retry_at: number | null = null, detail = '') {
    super(detail || kind);
    this.name = 'ProviderError';
    this.kind = kind;
    this.retry_at = retry_at;
  }
}

export type ConnectionResult = { ok: true } | { ok: false; reason: ProviderErrorKind };

export interface ImageRequest {
  /** This page's image description. */
  description: string;
  style_id: ArtStyle;
  /** The user's own style description, used when style_id is 'custom'. */
  custom_style: string;
  /** Fixed sentence describing the hero's look. */
  hero_card: string;
  /** Data URL; used only if the provider supports reference images. */
  reference_image: string | null;
  /** 0 is the cover; story pages start at 1. */
  page_index: number;
  lang: Lang;
}

/** Which box "Ask AI for help" writes into. */
export type AssistKind = 'hero_name' | 'hero_look' | 'topic' | 'plot' | 'page_text' | 'page_image';

/** One "Ask AI for help" request. Only the book's own content goes in it. */
export interface AssistRequest {
  kind: AssistKind;
  lang: Lang;
  seed: StorySeed;
  /** What the box holds now; empty asks for a first draft. For 'plot' this is the summary. */
  current: string;
  /** 'plot' only: the title the user has now. */
  current_title?: string;
  /** The chosen plot, for page words and picture notes. */
  plot?: Plot | null;
  /** 1-based story page number, for page words and picture notes. */
  page_number?: number;
  /** Words on the pages before and after, so the story flows. */
  previous_text?: string;
  next_text?: string;
  /** 'page_image' only: the words on this page. */
  page_text?: string;
}

/** 'plot' gives a title and a summary; every other kind gives one text. */
export type AssistResult = { title: string; summary: string } | { text: string };

export interface TextProvider {
  id: string;
  /** Suggests three plots. */
  suggestPlots(seed: StorySeed, lang: Lang): Promise<Plot[]>;
  /** Makes every page's text and image description in one request. */
  splitIntoPages(plot: Plot, seed: StorySeed, lang: Lang): Promise<PageDraft[]>;
  /** Writes a draft for one box, or polishes what the user wrote there. */
  assist(req: AssistRequest): Promise<AssistResult>;
  testConnection(): Promise<ConnectionResult>;
}

export interface ImageProvider {
  id: string;
  /** Name shown in the AI credit on the book's last page. */
  model_name: string;
  supportsReferenceImage: boolean;
  generate(req: ImageRequest): Promise<Blob>;
  testConnection(): Promise<ConnectionResult>;
}
