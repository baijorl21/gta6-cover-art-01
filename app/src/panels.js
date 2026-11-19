// Panel layouts for the cover: the multi-panel poster grids, each panel's shape on the canvas,
// and how a photo is drawn inside a panel (cover-fit, panned and zoomed per panel).
import { applyGradeFilter, applyGradeOverlay } from './grade.js';

/** The layouts the editor offers: an id, a display name and how many panels each one cuts the cover into. */
export const PANEL_LAYOUTS = [
  { id: 'hero-split', name: 'Hero + Duo', panelCount: 3 },
  { id: 'quad-grid', name: 'Quad Grid', panelCount: 4 },
  { id: 'triple-strips', name: 'Triple Strips', panelCount: 3 },
  { id: 'diagonal-duo', name: 'Diagonal Duo', panelCount: 2 },
  { id: 'duo-stack', name: 'Duo Stack', panelCount: 2 },
];

/** The layout record for an id, falling back to the first layout. */
export function layoutById(layoutId) {
  return PANEL_LAYOUTS.find((layout) => layout.id === layoutId) ?? PANEL_LAYOUTS[0];
}

/** A rectangular panel shape, with its own bounding box. */
function rectPanel(x, y, w, h) {
  return { kind: 'rect', x, y, w, h, bounds: { x, y, w, h } };
}

/** A polygonal panel shape (the diagonal split), with the bounding box of its points. */
function polyPanel(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { kind: 'poly', points, bounds: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y } };
}

/**
 * The panel shapes of a layout on a w x h canvas, in reading order. Panels fill the whole cover
 * edge to edge, separated by a dark gutter whose width scales with the smaller side.
 */
export function panelShapesForLayout(layoutId, w, h) {
  const gutter = Math.max(6, Math.round(Math.min(w, h) * 0.012));
  switch (layoutId) {
    case 'quad-grid': {
      const pw = (w - gutter) / 2;
      const ph = (h - gutter) / 2;
      return [
        rectPanel(0, 0, pw, ph),
        rectPanel(pw + gutter, 0, pw, ph),
        rectPanel(0, ph + gutter, pw, ph),
        rectPanel(pw + gutter, ph + gutter, pw, ph),
      ];
    }
    case 'triple-strips': {
      const pw = (w - 2 * gutter) / 3;
      return [0, 1, 2].map((i) => rectPanel(i * (pw + gutter), 0, pw, h));
    }
    case 'hero-split': {
      const heroW = Math.round(w * 0.58);
      const sideH = (h - gutter) / 2;
      return [
        rectPanel(0, 0, heroW, h),
        rectPanel(heroW + gutter, 0, w - heroW - gutter, sideH),
        rectPanel(heroW + gutter, sideH + gutter, w - heroW - gutter, sideH),
      ];
    }
    case 'duo-stack': {
      const ph = (h - gutter) / 2;
      return [rectPanel(0, 0, w, ph), rectPanel(0, ph + gutter, w, ph)];
    }
    case 'diagonal-duo': {
      const topX = w * 0.62;
      const bottomX = w * 0.38;
      const half = gutter * 0.55;
      return [
        polyPanel([[0, 0], [topX - half, 0], [bottomX - half, h], [0, h]]),
        polyPanel([[topX + half, 0], [w, 0], [w, h], [bottomX + half, h]]),
      ];
    }
    default:
      return panelShapesForLayout('hero-split', w, h);
  }
}

/** Traces a panel shape as the current path, ready to clip or stroke. */
export function tracePanelPath(ctx, shape) {
  ctx.beginPath();
  if (shape.kind === 'rect') {
    ctx.rect(shape.x, shape.y, shape.w, shape.h);
    return;
  }
  shape.points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

/** Whether a point falls inside a panel shape (rectangle test, or ray casting for a polygon). */
export function pointInPanel(shape, x, y) {
  const b = shape.bounds;
  if (x < b.x || y < b.y || x > b.x + b.w || y > b.y + b.h) return false;
  if (shape.kind === 'rect') return true;
  let inside = false;
  const pts = shape.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The index of the panel under a canvas point, or -1 when the point is on a gutter. */
export function panelIndexAtPoint(shapes, x, y) {
  for (let i = 0; i < shapes.length; i++) {
    if (pointInPanel(shapes[i], x, y)) return i;
  }
  return -1;
}

/**
 * Where a photo lands inside a panel's bounding box: cover-fit scaled by the slot's zoom, then
 * offset by its pan (-1..1 across the slack). Returns the drawn rect and the slack on each axis.
 */
export function photoRectInPanel(photo, bounds, slot) {
  const coverScale = Math.max(bounds.w / photo.naturalWidth, bounds.h / photo.naturalHeight);
  const scale = coverScale * slot.zoom;
  const dw = photo.naturalWidth * scale;
  const dh = photo.naturalHeight * scale;
  return {
    dx: bounds.x + (bounds.w - dw) * (0.5 + slot.panX * 0.5),
    dy: bounds.y + (bounds.h - dh) * (0.5 + slot.panY * 0.5),
    dw,
    dh,
    slackX: bounds.w - dw,
    slackY: bounds.h - dh,
  };
}

/** The placeholder painted in a panel with no photo yet: a dusk gradient and an invitation. */
function drawEmptyPanel(ctx, shape) {
  const b = shape.bounds;
  const sky = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
  sky.addColorStop(0, '#3a1454');
  sky.addColorStop(0.55, '#8a2468');
  sky.addColorStop(1, '#e85d3d');
  ctx.fillStyle = sky;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const plusSize = Math.min(b.w, b.h) * 0.22;
  ctx.font = `300 ${plusSize}px sans-serif`;
  ctx.fillText('+', b.x + b.w / 2, b.y + b.h / 2 - plusSize * 0.35);
  ctx.font = `700 ${Math.max(13, Math.min(b.w, b.h) * 0.055)}px sans-serif`;
  ctx.fillText('ADD A PHOTO', b.x + b.w / 2, b.y + b.h / 2 + plusSize * 0.45);
}

/**
 * Draws one panel: the slot's photo cover-fitted with its pan and zoom, graded, clipped to the
 * panel shape. A slot with no photo gets the placeholder instead.
 */
export function drawPhotoInPanel(ctx, shape, photo, slot, grade, intensity) {
  ctx.save();
  tracePanelPath(ctx, shape);
  ctx.clip();
  if (photo) {
    const r = photoRectInPanel(photo, shape.bounds, slot);
    applyGradeFilter(ctx, grade, intensity);
    ctx.drawImage(photo, r.dx, r.dy, r.dw, r.dh);
    ctx.filter = 'none';
    applyGradeOverlay(ctx, grade, intensity, shape.bounds);
  } else {
    drawEmptyPanel(ctx, shape);
  }
  ctx.restore();
}

/** Draws every panel of the cover's layout, each from its slot in the state. */
export function drawPanelGrid(ctx, w, h, state) {
  const shapes = panelShapesForLayout(state.layoutId, w, h);
  shapes.forEach((shape, i) => {
    const slot = state.panels[i];
    const photo = slot ? state.photos.find((p) => p.id === slot.photoId)?.img ?? null : null;
    drawPhotoInPanel(ctx, shape, photo, slot ?? { panX: 0, panY: 0, zoom: 1 }, state.grade, state.gradeIntensity);
  });
  return shapes;
}

/** The editor-only highlight around the selected panel: a dashed accent outline and a small label chip. */
export function drawSelectedPanelHighlight(ctx, shape, index, canvasW) {
  const accent = '#ffd166';
  ctx.save();
  tracePanelPath(ctx, shape);
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(3, canvasW * 0.004);
  ctx.setLineDash([canvasW * 0.012, canvasW * 0.008]);
  ctx.stroke();
  ctx.setLineDash([]);
  const label = `PANEL ${index + 1}`;
  const fontSize = Math.max(16, canvasW * 0.016);
  ctx.font = `800 ${fontSize}px sans-serif`;
  const chipW = ctx.measureText(label).width + fontSize * 1.2;
  const chipH = fontSize * 1.7;
  const chipX = shape.bounds.x + fontSize * 0.6;
  const chipY = shape.bounds.y + fontSize * 0.6;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, chipH * 0.3);
  ctx.fill();
  ctx.fillStyle = '#24102e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, chipX + chipW / 2, chipY + chipH / 2 + 1);
  ctx.restore();
}
