// Poster lettering: the cover's bold caption and its small subtitle, drawn in heavy system type
// with a dark outline, a soft shadow and a slight forward slant, auto-fitted to the cover's width.

/** The heavy system font stack the lettering uses (no font files, nothing downloaded). */
const POSTER_FONT_STACK = '"Arial Black", "Archivo Black", "Helvetica Neue", Arial, sans-serif';

/** The font string for a caption at a given pixel size. */
function posterFont(size) {
  return `900 ${size}px ${POSTER_FONT_STACK}`;
}

/**
 * The largest caption size whose measured width fits inside maxWidth, starting from startSize
 * and stepping down. Returns the size to draw at.
 */
export function fitCaptionFontSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = posterFont(size);
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = posterFont(size);
  }
  return size;
}

/** The soft dark band behind the lettering, fading in from the edge the caption sits on. */
export function drawCaptionBand(ctx, w, h, position) {
  const bandH = h * 0.34;
  const band = position === 'top'
    ? ctx.createLinearGradient(0, 0, 0, bandH)
    : ctx.createLinearGradient(0, h, 0, h - bandH);
  band.addColorStop(0, 'rgba(10, 2, 18, 0.62)');
  band.addColorStop(1, 'rgba(10, 2, 18, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, position === 'top' ? 0 : h - bandH, w, bandH);
}

/**
 * Draws the caption block: the big slanted title and, when given, the letter-spaced subtitle
 * beneath it. The block hugs the top or bottom edge of the cover by `position`.
 */
export function drawCaptionLettering(ctx, w, h, caption, subtitle, position) {
  const title = (caption ?? '').trim().toUpperCase();
  const sub = (subtitle ?? '').trim().toUpperCase();
  if (!title && !sub) return;

  const edge = h * 0.055;
  const titleSize = title ? fitCaptionFontSize(ctx, title, w * 0.92, h * 0.135) : 0;
  const subSize = sub ? Math.max(12, titleSize * 0.26) : 0;
  const blockH = titleSize + (sub ? subSize * 1.9 : 0);

  // Baselines: at the bottom the subtitle sits lowest; at the top the title sits highest.
  let titleBaseline;
  let subBaseline;
  if (position === 'top') {
    titleBaseline = edge + titleSize * 0.82;
    subBaseline = titleBaseline + subSize * 1.55;
  } else {
    subBaseline = h - edge;
    titleBaseline = subBaseline - (sub ? subSize * 1.9 : 0);
    if (!sub) titleBaseline = h - edge;
  }
  if (!title) {
    subBaseline = position === 'top' ? edge + subSize : h - edge;
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (title) {
    ctx.save();
    ctx.translate(w / 2, titleBaseline);
    ctx.transform(1, 0, -0.07, 1, 0, 0); // a slight forward slant, like poster type
    ctx.font = posterFont(titleSize);
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = 'rgba(14, 4, 22, 0.95)';
    ctx.lineWidth = titleSize * 0.2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = titleSize * 0.16;
    ctx.shadowOffsetY = titleSize * 0.05;
    ctx.strokeText(title, 0, 0);
    const fill = ctx.createLinearGradient(0, -titleSize, 0, titleSize * 0.15);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, '#ffe9c9');
    ctx.fillStyle = fill;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }

  if (sub) {
    ctx.save();
    ctx.font = `700 ${subSize}px ${POSTER_FONT_STACK}`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch { /* older canvas: spacing is a nicety */ }
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillStyle = 'rgba(255, 244, 224, 0.96)';
    ctx.fillText(sub, w / 2, subBaseline);
    ctx.restore();
  }

  ctx.restore();
}
