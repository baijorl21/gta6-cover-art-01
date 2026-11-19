// Fixed scenes for screenshots, driven by the page's query string:
//   ?shot=editor  the editor with a scene applied and a panel selected
//   ?shot=cover   the cover alone, filling the viewport at its export aspect
//   ?shot=export  like cover, and window.__coverPngDataUrl holds the full-resolution PNG the
//                 app's own export renders, so a screenshot can be that PNG scaled down
// Scene knobs: size, layout, grade, intensity, caption, subtitle, pos, photos (sample names per
// panel slot, comma separated), zooms (comma separated), pans (x,y pairs separated by ;) and
// panel (the selected panel index). window.__shotReady is set once the scene has painted.

/** Parses a comma list of numbers, padding with a fallback to the wanted length. */
function numberList(raw, fallback, length) {
  const values = (raw ?? '').split(',').map((v) => Number.parseFloat(v)).filter((v) => Number.isFinite(v));
  while (values.length < length) values.push(fallback);
  return values.slice(0, length);
}

/** Parses pans like "0,0;-0.3,0.2" into [x, y] pairs, padded with centred pans. */
function panList(raw, length) {
  const pairs = (raw ?? '').split(';').map((pair) => {
    const [x, y] = pair.split(',').map((v) => Number.parseFloat(v));
    return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
  });
  while (pairs.length < length) pairs.push([0, 0]);
  return pairs.slice(0, length);
}

/** Applies a screenshot scene to the editor state through the api main.js hands in. */
export function applyShotScene(shot, query, api) {
  const { state } = api;
  if (query.get('size')) api.setSize(query.get('size'));
  if (query.get('layout')) state.layoutId = query.get('layout');
  if (query.get('grade')) api.setGrade(query.get('grade'));
  if (query.get('intensity')) state.gradeIntensity = Number.parseFloat(query.get('intensity'));
  if (query.has('caption')) state.caption = query.get('caption');
  if (query.has('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('pos')) state.captionPosition = query.get('pos');

  const photoNames = (query.get('photos') ?? '').split(',').filter(Boolean);
  const zooms = numberList(query.get('zooms'), 1, state.panels.length);
  const pans = panList(query.get('pans'), state.panels.length);
  state.panels.forEach((slot, i) => {
    const photo = photoNames.length
      ? state.photos.find((p) => p.id === `sample-${photoNames[i % photoNames.length]}`)
      : null;
    if (photo) slot.photoId = photo.id;
    slot.zoom = zooms[i];
    slot.panX = pans[i][0];
    slot.panY = pans[i][1];
  });

  if (shot === 'cover' || shot === 'export') document.body.classList.add('shot-cover');
  if (query.get('panel')) api.selectPanel(Number.parseInt(query.get('panel'), 10) || 0);
  api.syncControls();
  api.renderPreview();

  if (shot === 'export') {
    window.__coverPngDataUrl = api.renderExportDataUrl();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
