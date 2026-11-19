// Colour grades for the cover art: two poster looks (a Vice City sunset and a neon night) plus
// a clean pass-through, each applied per panel as a canvas filter on the photo and a gradient
// wash over it, both scaled by one intensity slider.

/** The grade presets the editor offers. */
export const GRADE_PRESETS = [
  { id: 'vice-sunset', name: 'Vice City Sunset' },
  { id: 'neon-night', name: 'Neon Night' },
  { id: 'clean', name: 'Clean' },
];

/** The grade record for an id, falling back to the sunset grade. */
export function gradeById(gradeId) {
  return GRADE_PRESETS.find((grade) => grade.id === gradeId) ?? GRADE_PRESETS[0];
}

/**
 * Sets the canvas filter a grade draws its photos with, at intensity t (0..1): the sunset grade
 * warms and enriches, the neon grade pushes saturation and contrast with a cool hue swing.
 */
export function applyGradeFilter(ctx, grade, t) {
  if (grade.id === 'vice-sunset') {
    ctx.filter = `saturate(${(1 + 0.55 * t).toFixed(3)}) contrast(${(1 + 0.16 * t).toFixed(3)}) brightness(${(1 + 0.05 * t).toFixed(3)}) sepia(${(0.16 * t).toFixed(3)})`;
  } else if (grade.id === 'neon-night') {
    ctx.filter = `saturate(${(1 + 0.65 * t).toFixed(3)}) contrast(${(1 + 0.24 * t).toFixed(3)}) brightness(${(1 - 0.03 * t).toFixed(3)}) hue-rotate(${(-10 * t).toFixed(2)}deg)`;
  } else {
    ctx.filter = 'none';
  }
}

/** The Vice City Sunset wash: hot orange at the top melting into magenta at the foot, in overlay. */
export function applyViceCityGrade(ctx, t, bounds) {
  const wash = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h);
  wash.addColorStop(0, `rgba(255, 150, 60, ${(0.5 * t).toFixed(3)})`);
  wash.addColorStop(0.45, `rgba(255, 80, 120, ${(0.12 * t).toFixed(3)})`);
  wash.addColorStop(1, `rgba(165, 20, 115, ${(0.55 * t).toFixed(3)})`);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.restore();
}

/** The Neon Night wash: electric cyan from one corner into hot magenta at the other, in overlay. */
export function applyNeonNightGrade(ctx, t, bounds) {
  const wash = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.w, bounds.y + bounds.h);
  wash.addColorStop(0, `rgba(0, 200, 255, ${(0.48 * t).toFixed(3)})`);
  wash.addColorStop(0.5, `rgba(90, 60, 220, ${(0.16 * t).toFixed(3)})`);
  wash.addColorStop(1, `rgba(255, 0, 180, ${(0.48 * t).toFixed(3)})`);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.restore();
}

/** Paints a grade's wash over one panel's bounds; the clean grade paints nothing. */
export function applyGradeOverlay(ctx, grade, t, bounds) {
  if (t <= 0) return;
  if (grade.id === 'vice-sunset') applyViceCityGrade(ctx, t, bounds);
  else if (grade.id === 'neon-night') applyNeonNightGrade(ctx, t, bounds);
}

/** How strong the vignette is for a grade at intensity t: graded covers get a deeper one. */
export function vignetteStrength(grade, t) {
  return grade.id === 'clean' ? 0.14 : 0.16 + 0.3 * t;
}

/** A soft dark vignette over the whole cover, pulling the eye to the middle of the poster. */
export function drawVignette(ctx, w, h, strength) {
  if (strength <= 0) return;
  const radius = Math.max(w, h) * 0.78;
  const shade = ctx.createRadialGradient(w / 2, h / 2, radius * 0.45, w / 2, h / 2, radius);
  shade.addColorStop(0, 'rgba(8, 0, 16, 0)');
  shade.addColorStop(1, `rgba(8, 0, 16, ${strength.toFixed(3)})`);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}
