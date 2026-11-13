// 가짜 그림 연결부. 키 없이 직접 만든 SVG 장면을 돌려준다. 자동 검사와 연습 모드에서 쓴다.
import { COVER_SCENE_INDEX, STORY_SCENE_COUNT, render_scene_svg } from '../art/scenes';
import { find_sample_scene } from '../data/sample_story';
import { maybe_fail } from './mock_failure';
import { mock_wait } from './mock_text';
import type { ImageProvider, ImageRequest } from './types';

/** 가짜 그림 연결부의 이름. 책 마지막 쪽에는 "연습용 그림"으로 보인다. */
export const MOCK_IMAGE_MODEL = 'mock-image';

/**
 * 요청에 맞는 장면 번호를 고른다. 표지는 표지 장면, 본문은 그림 설명이 예시와 같으면 그 장면을 쓴다.
 */
export function pick_scene_index(req: Pick<ImageRequest, 'description' | 'page_index'>): number {
  if (req.page_index === 0) return COVER_SCENE_INDEX;
  const sample_scene = find_sample_scene(req.description);
  if (sample_scene !== null) return sample_scene;
  return ((req.page_index - 1) % STORY_SCENE_COUNT) + 1;
}

/**
 * 가짜 그림 연결부를 만든다.
 */
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
