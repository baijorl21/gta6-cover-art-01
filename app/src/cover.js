// The cover itself: panels, grade, vignette and lettering composed onto one canvas, and the
// full-resolution PNG export rendered from the same drawing code the preview uses.
import { drawPanelGrid } from './panels.js';
import { drawVignette, vignetteStrength } from './grade.js';
import { drawCaptionBand, drawCaptionLettering } from './caption.js';

/** The post sizes the editor exports, in pixels. */
export const EXPORT_SIZES = [
  { id: 'landscape', name: 'Landscape', w: 1920, h: 1080 },
  { id: 'square', name: 'Square', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait', w: 1080, h: 1350 },
];

/** The export size record for an id, falling back to landscape. */
export function exportSizeById(sizeId) {
  return EXPORT_SIZES.find((size) => size.id === sizeId) ?? EXPORT_SIZES[0];
}

/** The deep dusk colour showing through the gutters between panels. */
export const COVER_BACKGROUND = '#14091f';

/**
 * Draws the whole cover at w x h: the dark backing, the panel grid with its grade, the vignette,
 * the caption band and the lettering. Returns the panel shapes drawn, for hit-testing.
 */
export function renderCover(ctx, w, h, state) {
  ctx.fillStyle = COVER_BACKGROUND;
  ctx.fillRect(0, 0, w, h);
  const shapes = drawPanelGrid(ctx, w, h, state);
  drawVignette(ctx, w, h, vignetteStrength(state.grade, state.gradeIntensity));
  if (state.caption.trim() || state.subtitle.trim()) {
    drawCaptionBand(ctx, w, h, state.captionPosition);
    drawCaptionLettering(ctx, w, h, state.caption, state.subtitle, state.captionPosition);
  }
  return shapes;
}

/** Renders the cover onto a fresh offscreen canvas at an export size and returns the canvas. */
export function renderCoverCanvas(state, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas.getContext('2d'), size.w, size.h, state);
  return canvas;
}

/** Renders the cover at an export size and resolves to its PNG blob, ready to download. */
export function exportCoverPng(state, size) {
  const canvas = renderCoverCanvas(state, size);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** The download filename for an export of a given size. */
export function coverFileName(size) {
  return `neon-cover-${size.w}x${size.h}.png`;
}
