// 체험판 책을 만든다. 예시 이야기와 직접 만든 SVG 그림으로 다 된 책 한 권을 조립한다.
import { COVER_SCENE_INDEX, render_scene_svg } from '../art/scenes';
import { DEFAULT_PAGE_COUNT, DEFAULT_STYLE_ID } from '../constants';
import { build_cover_description } from '../providers/prompts';
import { build_pages, create_book } from '../store/book_model';
import type { Book, Lang, PageImage } from '../types';
import { svg_to_data_url } from '../utils/image';
import { SAMPLE_HERO, find_sample_scene, get_sample_pages, get_sample_plots } from './sample_story';

/** 체험판에 쓰는 줄거리 */
const DEMO_PLOT_ID = 'sample-1';

/**
 * 장면 번호로 체험판 그림을 만든다. 직접 만든 그림이므로 AI 그림으로 표시하지 않는다.
 */
function demo_image(scene_index: number): PageImage {
  return { data_url: svg_to_data_url(render_scene_svg(scene_index, DEFAULT_STYLE_ID)), source: 'upload' };
}

/**
 * 주어진 언어의 체험판 책을 만든다.
 */
export function build_demo_book(lang: Lang): Book {
  const hero = SAMPLE_HERO[lang];
  const plots = get_sample_plots(lang, hero.name);
  const plot = plots.find((item) => item.id === DEMO_PLOT_ID) ?? plots[0] ?? { id: DEMO_PLOT_ID, title: '', summary: '' };
  const drafts = get_sample_pages(plot.id, lang, hero.name, DEFAULT_PAGE_COUNT);
  const pages = build_pages(plot.title, build_cover_description(plot.title, plot.summary, lang), drafts).map((page, index) => ({
    ...page,
    image: demo_image(index === 0 ? COVER_SCENE_INDEX : (find_sample_scene(page.image_prompt) ?? index)),
  }));
  return {
    ...create_book(lang),
    seed: { age_band: '8-10', topic: '', hero_name: hero.name, hero_look: hero.look, page_count: DEFAULT_PAGE_COUNT },
    plots,
    chosen_plot: plot,
    pages,
    step: 'finish',
  };
}
