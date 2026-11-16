// Mock image provider. Returns hand-made SVG scenes without a key; used by tests and practice mode.
import { COVER_SCENE_INDEX, STORY_SCENE_COUNT, render_scene_svg } from '../art/scenes';
import { find_sample_scene } from '../data/sample_story';
import { maybe_fail } from './mock_failure';
import { mock_wait } from './mock_text';
import type { ImageProvider, ImageRequest } from './types';

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
    generate: async (req: ImageRequest): Promise<Blob> => {
      await mock_wait();
      maybe_fail('generate');
      const svg = render_scene_svg(pick_scene_index(req), req.style_id);
      return new Blob([svg], { type: 'image/svg+xml' });
    },
    testConnection: async () => ({ ok: true }),
  };
}
