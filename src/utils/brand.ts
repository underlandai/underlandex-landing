// Brand artwork is read from the official SVG files (src/assets/images/underlandex) and inlined,
// so the mark is drawn from the same paths at every size.
import markRaw from '~/assets/images/underlandex/mark.svg?raw';

export const MARK_VIEWBOX = '0 0 94.394463 94.87484';
export const LOGO_VIEWBOX = '0 0 250.13499 48.360001';
// Placement of the mark inside the full lock-up, as drawn in logo.svg.
export const LOGO_MARK_TRANSFORM = 'matrix(0.45,0,0,0.45,1.8308445,2.8337794)';

export interface MarkPath {
  fill: string;
  d: string;
}

export const markPaths: MarkPath[] = [...markRaw.matchAll(/<path\b[^>]*>/g)]
  .map((m) => {
    const tag = m[0];
    const fill = /fill:(#[0-9a-fA-F]{3,8})/.exec(tag)?.[1];
    const d = /\sd="([^"]+)"/.exec(tag)?.[1];
    return fill && d ? { fill, d: d.replace(/\s+/g, ' ').trim() } : null;
  })
  .filter((p): p is MarkPath => p !== null);
