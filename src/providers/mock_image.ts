// Mock image provider. Returns hand-made SVG scenes without a key; used by tests and practice mode.
import { parse_recolor_note, recolor_svg } from '../art/recolor';
import { COVER_SCENE_INDEX, STORY_SCENE_COUNT, load_scene_art, render_scene_svg } from '../art/scenes';
import { find_sample_scene } from '../data/sample_story';
import { split_data_url } from '../utils/image';
import { maybe_fail } from './mock_failure';
import { mock_wait } from './mock_text';
import { ProviderError, type ImageEditRequest, type ImageProvider, type ImageRequest } from './types';

const SVG_MIME_TYPE = 'image/svg+xml';

/** The SVG text of a sample picture's data URL, or null for any other picture. */
export function read_svg_data_url(data_url: string): string | null {
  const parts = split_data_url(data_url);
  if (parts?.mime_type !== SVG_MIME_TYPE) return null;
  const binary = atob(parts.base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Practice "Fix the picture": recolors one thing in a sample picture, or explains that only that works. */
async function practice_edit(req: ImageEditRequest): Promise<Blob> {
  await mock_wait();
  maybe_fail('generate');
  const svg = read_svg_data_url(req.image);
  const request = parse_recolor_note(req.note);
  const recolored = svg && request ? recolor_svg(svg, request) : null;
  if (!recolored) throw new ProviderError('practice_edit', null, 'practice edit not understood');
  return new Blob([recolored], { type: SVG_MIME_TYPE });
}

/** Shown as "practice image" on the book's last page. */
export const MOCK_IMAGE_MODEL = 'mock-image';

/**
 * Picks a scene index. The cover gets the cover scene; a story page whose description
 * matches the sample story gets that sample's scene.
 */
export function pick_scene_index(req: Pick<ImageRequest, 'description' | 'page_index'>): number {
  if (req.page_index === 0) return COVER_SCENE_INDEX;
  const sample_scene = find_sample_scene(req.description);
  if (sample_scene !== null) return sample_scene;
  return ((req.page_index - 1) % STORY_SCENE_COUNT) + 1;
}

export function create_mock_image(): ImageProvider {
  return {
    id: 'mock-image',
    model_name: MOCK_IMAGE_MODEL,
    supportsReferenceImage: false,
    supportsEdit: true,
    generate: async (req: ImageRequest): Promise<Blob> => {
      await Promise.all([mock_wait(), load_scene_art()]);
      maybe_fail('generate');
      const svg = render_scene_svg(pick_scene_index(req), req.style_id);
      return new Blob([svg], { type: SVG_MIME_TYPE });
    },
    edit: practice_edit,
    testConnection: async () => ({ ok: true }),
  };
}
