// Plain sample-story scenes, loaded on demand by ./scenes.ts so they stay out of the first download.
import cover from './scenes/cover.svg?raw';
import scene1 from './scenes/scene1.svg?raw';
import scene2 from './scenes/scene2.svg?raw';
import scene3 from './scenes/scene3.svg?raw';
import scene4 from './scenes/scene4.svg?raw';
import scene5 from './scenes/scene5.svg?raw';
import scene6 from './scenes/scene6.svg?raw';
import scene7 from './scenes/scene7.svg?raw';
import scene8 from './scenes/scene8.svg?raw';

/** Index 0 is the cover, 1-8 are the story scenes. */
export const BASE_SCENES: readonly string[] = [cover, scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8].map((svg) =>
  svg.trim(),
);
