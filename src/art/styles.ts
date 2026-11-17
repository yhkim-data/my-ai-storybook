// Art-style treatments. Each style wraps a plain base scene in SVG filters, so the six styles
// share one drawing and need no raster images. Base scenes mark separately shaped pieces with
// data-part="1"; the clay and paper-cut styles light or shadow each of those pieces.
import type { StyleId } from '../types';

interface Treatment {
  /** Filter definitions placed in <defs>. */
  defs: string;
  /** Id of the filter applied to the whole picture. */
  root: string;
  /** Rotates the root filter's space so stroke textures run diagonally. */
  rotated: boolean;
  /** Id of the filter applied to each data-part piece, if any. */
  part: string | null;
}

/** Angle of crayon and pencil strokes (degrees). */
const STROKE_ROTATION = 35;
/** Center of the 1024 x 1024 canvas. */
const CENTER = 512;
const PART_MARK = 'data-part="1"';
const SVG_END = '</svg>';

export const STYLE_TREATMENTS: Record<StyleId, Treatment> = {
  watercolor: {
    defs:
      '<filter id="sw" x="0" y="0" width="1024" height="1024" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="4" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="20" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
      '<feGaussianBlur in="d" stdDeviation="1.8" result="s"/><feComponentTransfer in="s" result="pl">' +
      '<feFuncR type="linear" slope="0.9" intercept="0.1"/>' +
      '<feFuncG type="linear" slope="0.9" intercept="0.1"/>' +
      '<feFuncB type="linear" slope="0.9" intercept="0.1"/></feComponentTransfer>' +
      '<feColorMatrix in="s" type="saturate" values="0" result="eg"/>' +
      '<feGaussianBlur in="eg" stdDeviation="1.5" result="ea"/>' +
      '<feGaussianBlur in="eg" stdDeviation="4" result="eb"/>' +
      '<feComposite in="ea" in2="eb" operator="arithmetic" k2="1" k3="-1" k4="1" result="e1"/>' +
      '<feComposite in="eb" in2="ea" operator="arithmetic" k2="1" k3="-1" k4="1" result="e2"/>' +
      '<feComponentTransfer in="e1" result="e3">' +
      '<feFuncR type="linear" slope="2.2" intercept="-1.2000000000000002"/>' +
      '<feFuncG type="linear" slope="2.2" intercept="-1.2000000000000002"/>' +
      '<feFuncB type="linear" slope="2.2" intercept="-1.2000000000000002"/></feComponentTransfer>' +
      '<feComponentTransfer in="e2" result="e4">' +
      '<feFuncR type="linear" slope="2.2" intercept="-1.2000000000000002"/>' +
      '<feFuncG type="linear" slope="2.2" intercept="-1.2000000000000002"/>' +
      '<feFuncB type="linear" slope="2.2" intercept="-1.2000000000000002"/></feComponentTransfer>' +
      '<feComposite in="e3" in2="e4" operator="arithmetic" k1="1" result="e"/>' +
      '<feComponentTransfer in="e" result="ei"><feFuncR type="linear" slope="-1" intercept="1"/>' +
      '<feFuncG type="linear" slope="-1" intercept="1"/><feFuncB type="linear" slope="-1" intercept="1"/>' +
      '</feComponentTransfer><feComposite in="ei" in2="eb" operator="arithmetic" k1="1" result="el"/>' +
      '<feComponentTransfer in="el" result="ef"><feFuncR type="linear" slope="-1" intercept="1"/>' +
      '<feFuncG type="linear" slope="-1" intercept="1"/><feFuncB type="linear" slope="-1" intercept="1"/>' +
      '</feComponentTransfer><feComposite in="pl" in2="ef" operator="arithmetic" k1="1" result="c1"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="2" seed="9" result="m"/>' +
      '<feColorMatrix in="m" type="matrix" values="0.4 0.3 0.3 0 0  0.4 0.3 0.3 0 0  0.4 0.3 0.3 0 0  0 0 0 0 1" result="mg"/>' +
      '<feComponentTransfer in="mg" result="mf"><feFuncR type="linear" slope="0.45" intercept="0.8"/>' +
      '<feFuncG type="linear" slope="0.45" intercept="0.8"/>' +
      '<feFuncB type="linear" slope="0.45" intercept="0.8"/></feComponentTransfer>' +
      '<feComposite in="c1" in2="mf" operator="arithmetic" k1="1" result="c2"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="2" result="pn"/>' +
      '<feColorMatrix in="pn" type="matrix" values="0.14 0 0 0 0.9299999999999999  0.14 0 0 0 0.9299999999999999  0.14 0 0 0 0.9299999999999999  0 0 0 0 1" result="p"/>' +
      '<feComposite in="c2" in2="p" operator="arithmetic" k1="1" result="c3"/>' +
      '<feFlood x="20" y="20" width="984" height="984" flood-color="#fff" result="r"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="15" result="bn"/>' +
      '<feDisplacementMap in="r" in2="bn" scale="34" xChannelSelector="R" yChannelSelector="G" result="rd"/>' +
      '<feGaussianBlur in="rd" stdDeviation="1.6" result="rb"/>' +
      '<feComposite in="c3" in2="rb" operator="in" result="pic"/>' +
      '<feFlood flood-color="#FFFDF8" result="pp"/>' +
      '<feComposite in="pp" in2="p" operator="arithmetic" k1="1" result="ppt"/><feMerge>' +
      '<feMergeNode in="ppt"/><feMergeNode in="pic"/></feMerge></filter>',
    root: 'sw',
    rotated: false,
    part: null,
  },
  crayon: {
    defs:
      '<filter id="sc" x="-232" y="-232" width="1488" height="1488" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
      '<feColorMatrix in="d" type="saturate" values="1.18" result="ds"/>' +
      '<feComponentTransfer in="ds" result="dl"><feFuncR type="linear" slope="0.92" intercept="0.08"/>' +
      '<feFuncG type="linear" slope="0.92" intercept="0.08"/>' +
      '<feFuncB type="linear" slope="0.92" intercept="0.08"/></feComponentTransfer>' +
      '<feColorMatrix in="d" type="saturate" values="0" result="eg"/>' +
      '<feGaussianBlur in="eg" stdDeviation="1.2" result="ea"/>' +
      '<feGaussianBlur in="eg" stdDeviation="3" result="eb"/>' +
      '<feComposite in="ea" in2="eb" operator="arithmetic" k2="1" k3="-1" k4="1" result="e1"/>' +
      '<feComposite in="eb" in2="ea" operator="arithmetic" k2="1" k3="-1" k4="1" result="e2"/>' +
      '<feComponentTransfer in="e1" result="e3"><feFuncR type="linear" slope="4.5" intercept="-3.5"/>' +
      '<feFuncG type="linear" slope="4.5" intercept="-3.5"/>' +
      '<feFuncB type="linear" slope="4.5" intercept="-3.5"/></feComponentTransfer>' +
      '<feComponentTransfer in="e2" result="e4"><feFuncR type="linear" slope="4.5" intercept="-3.5"/>' +
      '<feFuncG type="linear" slope="4.5" intercept="-3.5"/>' +
      '<feFuncB type="linear" slope="4.5" intercept="-3.5"/></feComponentTransfer>' +
      '<feComposite in="e3" in2="e4" operator="arithmetic" k1="1" result="e"/>' +
      '<feComponentTransfer in="e" result="ei"><feFuncR type="linear" slope="-1" intercept="1"/>' +
      '<feFuncG type="linear" slope="-1" intercept="1"/><feFuncB type="linear" slope="-1" intercept="1"/>' +
      '</feComponentTransfer>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.04 0.4" numOctaves="2" seed="17" result="ln"/>' +
      '<feColorMatrix in="ln" type="matrix" values="-2.2 0 0 0 1.9  -2.2 0 0 0 1.9  -2.2 0 0 0 1.9  0 0 0 0 1" result="lm"/>' +
      '<feComposite in="ei" in2="lm" operator="arithmetic" k1="1" result="edm"/>' +
      '<feColorMatrix in="edm" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.22  0.75 0 0 0 0" result="line"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.03 0.45" numOctaves="2" seed="8" result="st"/>' +
      '<feColorMatrix in="st" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.2 0 0 0 -1.3" result="gm"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="2" seed="6" result="pn"/>' +
      '<feColorMatrix in="pn" type="matrix" values="0.16 0 0 0 0.92  0.16 0 0 0 0.92  0.16 0 0 0 0.92  0 0 0 0 1" result="p"/>' +
      '<feComposite in="dl" in2="p" operator="arithmetic" k1="1" result="c1"/>' +
      '<feComponentTransfer in="c1" result="lite"><feFuncR type="linear" slope="0.62" intercept="0.38"/>' +
      '<feFuncG type="linear" slope="0.62" intercept="0.38"/>' +
      '<feFuncB type="linear" slope="0.62" intercept="0.38"/></feComponentTransfer>' +
      '<feComposite in="lite" in2="gm" operator="in" result="gap"/><feMerge><feMergeNode in="c1"/>' +
      '<feMergeNode in="gap"/><feMergeNode in="line"/></feMerge></filter>',
    root: 'sc',
    rotated: true,
    part: null,
  },
  clay: {
    defs:
      '<filter id="skp" x="-20%" y="-20%" width="140%" height="150%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="7" result="b"/>' +
      '<feDiffuseLighting in="b" surfaceScale="5" diffuseConstant="1.24" lighting-color="#fff" result="df">' +
      '<feDistantLight azimuth="235" elevation="50"/></feDiffuseLighting>' +
      '<feSpecularLighting in="b" surfaceScale="5" specularConstant="0.6" specularExponent="16" lighting-color="#fff" result="sp">' +
      '<feDistantLight azimuth="235" elevation="50"/></feSpecularLighting>' +
      '<feComposite in="SourceGraphic" in2="df" operator="arithmetic" k1="1" result="sh"/>' +
      '<feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/>' +
      '<feComposite in="sh" in2="sp2" operator="arithmetic" k2="1" k3="0.5" result="lit"/>' +
      '<feComposite in="lit" in2="SourceAlpha" operator="in" result="obj"/>' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="5" result="sb"/>' +
      '<feOffset in="sb" dx="3" dy="7" result="so"/>' +
      '<feColorMatrix in="so" type="matrix" values="0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0.3 0" result="shadow"/>' +
      '<feMerge><feMergeNode in="shadow"/><feMergeNode in="obj"/></feMerge></filter>' +
      '<filter id="sk" x="0" y="0" width="1024" height="1024" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="12" result="tn"/>' +
      '<feColorMatrix in="tn" type="matrix" values="0.1 0 0 0 0.95  0.1 0 0 0 0.95  0.1 0 0 0 0.95  0 0 0 0 1" result="t"/>' +
      '<feComposite in="SourceGraphic" in2="t" operator="arithmetic" k1="1" result="m"/>' +
      '<feColorMatrix in="m" type="saturate" values="1.08"/></filter>',
    root: 'sk',
    rotated: false,
    part: 'skp',
  },
  papercut: {
    defs:
      '<filter id="spp" x="-10%" y="-10%" width="125%" height="135%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="5" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="cut"/>' +
      '<feColorMatrix in="cut" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0.46 0" result="sa"/>' +
      '<feGaussianBlur in="sa" stdDeviation="4" result="sb"/><feOffset in="sb" dx="3" dy="6" result="so"/>' +
      '<feMerge><feMergeNode in="so"/><feMergeNode in="cut"/></feMerge></filter>' +
      '<filter id="sp" x="0" y="0" width="1024" height="1024" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feComponentTransfer in="SourceGraphic" result="q">' +
      '<feFuncR type="discrete" tableValues="0.05 0.15 0.25 0.35 0.45 0.55 0.65 0.75 0.85 0.95"/>' +
      '<feFuncG type="discrete" tableValues="0.05 0.15 0.25 0.35 0.45 0.55 0.65 0.75 0.85 0.95"/>' +
      '<feFuncB type="discrete" tableValues="0.05 0.15 0.25 0.35 0.45 0.55 0.65 0.75 0.85 0.95"/>' +
      '</feComponentTransfer>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="2" seed="6" result="tn"/>' +
      '<feColorMatrix in="tn" type="matrix" values="0.14 0 0 0 0.9299999999999999  0.14 0 0 0 0.9299999999999999  0.14 0 0 0 0.9299999999999999  0 0 0 0 1" result="t"/>' +
      '<feComposite in="q" in2="t" operator="arithmetic" k1="1" result="m"/>' +
      '<feColorMatrix in="m" type="saturate" values="0.92"/></filter>',
    root: 'sp',
    rotated: false,
    part: 'spp',
  },
  pencil: {
    defs:
      '<filter id="sn" x="-232" y="-232" width="1488" height="1488" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feColorMatrix in="SourceGraphic" type="saturate" values="0" result="g"/>' +
      '<feColorMatrix in="SourceGraphic" type="saturate" values="0" result="eg"/>' +
      '<feGaussianBlur in="eg" stdDeviation="1" result="ea"/>' +
      '<feGaussianBlur in="eg" stdDeviation="2.6" result="eb"/>' +
      '<feComposite in="ea" in2="eb" operator="arithmetic" k2="1" k3="-1" k4="1" result="e1"/>' +
      '<feComponentTransfer in="e1" result="e"><feFuncR type="linear" slope="4" intercept="-3"/>' +
      '<feFuncG type="linear" slope="4" intercept="-3"/><feFuncB type="linear" slope="4" intercept="-3"/>' +
      '</feComponentTransfer>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="21" result="w"/>' +
      '<feDisplacementMap in="e" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G" result="ln"/>' +
      '<feComponentTransfer in="g" result="D0"><feFuncR type="linear" slope="-1" intercept="1"/>' +
      '<feFuncG type="linear" slope="-1" intercept="1"/><feFuncB type="linear" slope="-1" intercept="1"/>' +
      '</feComponentTransfer><feComponentTransfer in="D0" result="D">' +
      '<feFuncR type="gamma" amplitude="0.8" exponent="1.3"/>' +
      '<feFuncG type="gamma" amplitude="0.8" exponent="1.3"/>' +
      '<feFuncB type="gamma" amplitude="0.8" exponent="1.3"/></feComponentTransfer>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.025 0.28" numOctaves="2" seed="13" result="h"/>' +
      '<feColorMatrix in="h" type="matrix" values="3.4 0 0 0 -1.25  3.4 0 0 0 -1.25  3.4 0 0 0 -1.25  0 0 0 0 1" result="hs"/>' +
      '<feComposite in="D" in2="hs" operator="arithmetic" k1="0.62" k2="0.2" result="T"/>' +
      '<feComponentTransfer in="T" result="tone0"><feFuncR type="linear" slope="-1" intercept="1"/>' +
      '<feFuncG type="linear" slope="-1" intercept="1"/><feFuncB type="linear" slope="-1" intercept="1"/>' +
      '</feComponentTransfer><feComposite in="tone0" in2="ln" operator="arithmetic" k1="1" result="tone"/>' +
      '<feColorMatrix in="tone" type="matrix" values="0.98 0 0 0 0.01  0 0.97 0 0 0.01  0 0 0.95 0 0.015  0 0 0 0 1" result="tt"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="2" seed="3" result="pn"/>' +
      '<feColorMatrix in="pn" type="matrix" values="0.12 0 0 0 0.94  0.12 0 0 0 0.94  0.12 0 0 0 0.94  0 0 0 0 1" result="p"/>' +
      '<feComposite in="tt" in2="p" operator="arithmetic" k1="1"/></filter>',
    root: 'sn',
    rotated: true,
    part: null,
  },
  pixel: {
    defs:
      '<filter id="sx" x="0" y="0" width="1024" height="1024" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feFlood x="6" y="6" width="4" height="4" flood-color="#000"/><feComposite width="16" height="16"/>' +
      '<feTile result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/>' +
      '<feMorphology operator="dilate" radius="6.2" result="px"/><feComponentTransfer in="px">' +
      '<feFuncR type="discrete" tableValues="0 .2 .38 .55 .7 .84 .94 1"/>' +
      '<feFuncG type="discrete" tableValues="0 .2 .38 .55 .7 .84 .94 1"/>' +
      '<feFuncB type="discrete" tableValues="0 .2 .38 .55 .7 .84 .94 1"/></feComponentTransfer></filter>',
    root: 'sx',
    rotated: false,
    part: null,
  },
};

/** Applies a style to a base scene. Unknown style ids return the base scene unchanged. */
export function apply_style(base_svg: string, style_id: string): string {
  const svg = base_svg.trim();
  const treatment = (STYLE_TREATMENTS as Record<string, Treatment | undefined>)[style_id];
  if (!treatment) return svg;
  const head_end = svg.indexOf('>') + 1;
  let inner = svg.slice(head_end, svg.length - SVG_END.length);
  if (treatment.part) inner = inner.replaceAll(PART_MARK, `filter="url(#${treatment.part})"`);
  const body = treatment.rotated
    ? `<g transform="rotate(-${STROKE_ROTATION} ${CENTER} ${CENTER})" filter="url(#${treatment.root})">` +
      `<g transform="rotate(${STROKE_ROTATION} ${CENTER} ${CENTER})">${inner}</g></g>`
    : `<g filter="url(#${treatment.root})">${inner}</g>`;
  return `${svg.slice(0, head_end)}<defs>${treatment.defs}</defs>${body}${SVG_END}`;
}
