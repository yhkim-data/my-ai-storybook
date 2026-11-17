// Sample-story scenes (cover + 8 story scenes) in six art styles. No external images.
// The plain scenes live in ./scenes/*.svg (regenerate with tools/art/build_scenes.py) and load on
// demand; ./styles.ts turns one plain scene into each art style with SVG filters.
import type { ArtStyle } from '../types';
import { apply_style } from './styles';

export const COVER_SCENE_INDEX = 0;
/** Story scenes are numbered 1..STORY_SCENE_COUNT. */
export const STORY_SCENE_COUNT = 8;

/** Plain paper, shown only if a scene is asked for before the art has loaded. */
const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">' +
  '<rect width="1024" height="1024" fill="#f6f1e7"/></svg>';

let base_scenes: readonly string[] | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Loads the scene art once; later calls reuse the same promise. A failed load can be retried. */
export function load_scene_art(): Promise<void> {
  loading ??= import('./scene_art').then(
    (module) => {
      base_scenes = module.BASE_SCENES;
      for (const listener of listeners) listener();
    },
    (error: unknown) => {
      loading = null;
      throw error;
    },
  );
  return loading;
}

export function is_scene_art_ready(): boolean {
  return base_scenes !== null;
}

/** Calls the listener once the art has loaded. Returns an unsubscribe function. */
export function subscribe_scene_art(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function normalize_scene_index(scene_index: number): number {
  const whole = Number.isFinite(scene_index) ? Math.trunc(scene_index) : 1;
  if (whole === COVER_SCENE_INDEX) return COVER_SCENE_INDEX;
  return ((((whole - 1) % STORY_SCENE_COUNT) + STORY_SCENE_COUNT) % STORY_SCENE_COUNT) + 1;
}

/** The plain scene without any art style. */
export function render_base_scene_svg(scene_index: number): string {
  return base_scenes?.[normalize_scene_index(scene_index)] ?? PLACEHOLDER_SVG;
}

/**
 * Returns a square SVG for a scene (0 = cover, 1-8 = story) in the given style; 'custom' gives the plain scene.
 * Out-of-range indices wrap into 1-8. Call load_scene_art() first.
 */
export function render_scene_svg(scene_index: number, style_id: ArtStyle): string {
  return apply_style(render_base_scene_svg(scene_index), style_id);
}
