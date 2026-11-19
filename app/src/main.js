// Neon Cover Studio's editor wiring: the photo pool, panel selection with drag-to-pan and
// scroll-to-zoom, layout and grade pickers, caption fields and the PNG export. Everything runs
// locally in the page; photos are read from the person's machine and never uploaded.
import { renderCover, renderCoverCanvas, exportCoverPng, coverFileName, exportSizeById } from './cover.js';
import { panelIndexAtPoint, photoRectInPanel, drawSelectedPanelHighlight, layoutById } from './panels.js';
import { gradeById } from './grade.js';
import { loadPhotoFile, loadAllSamples } from './photos.js';
import { applyShotScene } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const poolEl = document.getElementById('photo-pool');
const panelNumberEl = document.getElementById('panel-number');
const zoomSlider = document.getElementById('panel-zoom');
const intensitySlider = document.getElementById('grade-intensity');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');

/** The whole editor state the cover renders from. Panels keep four slots; layouts use the first few. */
const state = {
  layoutId: 'hero-split',
  grade: gradeById('vice-sunset'),
  gradeIntensity: 0.85,
  caption: 'NEON HORIZON',
  subtitle: 'ONE LAST SCORE',
  captionPosition: 'bottom',
  photos: [],
  panels: [
    { photoId: null, panX: 0, panY: 0, zoom: 1 },
    { photoId: null, panX: 0, panY: 0, zoom: 1 },
    { photoId: null, panX: -0.25, panY: 0.15, zoom: 1.6 },
    { photoId: null, panX: 0.25, panY: -0.15, zoom: 1.8 },
  ],
};

let selectedPanel = 0;
let currentSize = exportSizeById('landscape');
let lastShapes = [];

/** Shows a short message under the export button. */
function setStatus(message) {
  statusLine.textContent = message;
}

/** Clamps a number into a range. */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** The photo a panel slot currently shows, or null. */
function photoOfSlot(slot) {
  return state.photos.find((p) => p.id === slot.photoId) ?? null;
}

/** Points the preview canvas at an export size, so the preview is the cover at full resolution. */
function setSize(sizeId) {
  currentSize = exportSizeById(sizeId);
  canvas.width = currentSize.w;
  canvas.height = currentSize.h;
  document.querySelectorAll('#size-buttons button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.size === currentSize.id);
  });
}

/** Sets the colour grade by id and lights its button. */
function setGrade(gradeId) {
  state.grade = gradeById(gradeId);
  document.querySelectorAll('#grade-buttons button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.grade === state.grade.id);
  });
}

/** Selects a panel (clamped to the layout's count) and syncs the panel controls to it. */
function selectPanel(index) {
  selectedPanel = clamp(index, 0, layoutById(state.layoutId).panelCount - 1);
  panelNumberEl.textContent = String(selectedPanel + 1);
  zoomSlider.value = String(state.panels[selectedPanel].zoom);
  markPoolSelection();
}

/** Redraws the preview: the cover plus the selected panel's highlight. */
function renderPreview() {
  lastShapes = renderCover(ctx, canvas.width, canvas.height, state);
  const shape = lastShapes[selectedPanel];
  if (shape && !document.body.classList.contains('shot-cover')) {
    drawSelectedPanelHighlight(ctx, shape, selectedPanel, canvas.width);
  }
}

/** Puts a photo into a panel slot. */
function assignPhotoToPanel(panelIndex, photoId) {
  state.panels[panelIndex].photoId = photoId;
  markPoolSelection();
  renderPreview();
}

/** Highlights the pool thumbnail the selected panel is using. */
function markPoolSelection() {
  const current = state.panels[selectedPanel]?.photoId;
  poolEl.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.photoId === current);
  });
}

/** Rebuilds the photo pool thumbnails from the state's photos. */
function renderPhotoPool() {
  poolEl.replaceChildren();
  for (const photo of state.photos) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.photoId = photo.id;
    btn.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    btn.append(img);
    btn.addEventListener('click', () => assignPhotoToPanel(selectedPanel, photo.id));
    poolEl.append(btn);
  }
  markPoolSelection();
}

/** Adds loaded photos to the pool and deals them into panels starting at the selected one. */
function addPhotosToPool(photos) {
  state.photos.push(...photos);
  const count = layoutById(state.layoutId).panelCount;
  photos.forEach((photo, i) => {
    state.panels[(selectedPanel + i) % count].photoId = photo.id;
  });
  renderPhotoPool();
  renderPreview();
  setStatus(photos.length === 1 ? 'Photo added' : `${photos.length} photos added`);
}

/** Loads the person's picked or dropped files into the pool. */
async function addPhotoFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith('image/'));
  if (!images.length) return;
  const photos = [];
  for (const file of images) photos.push(await loadPhotoFile(file));
  addPhotosToPool(photos);
}

/** Loads the bundled samples (once) and deals them across the panels for an instant demo cover. */
async function ensureSamples() {
  if (state.photos.some((p) => p.id.startsWith('sample-'))) return;
  const samples = await loadAllSamples();
  state.photos.push(...samples);
  const [boulevard, pier] = samples;
  state.panels[0].photoId = boulevard.id;
  state.panels[1].photoId = pier.id;
  state.panels[2].photoId = boulevard.id;
  state.panels[3].photoId = pier.id;
  renderPhotoPool();
}

/** Reflects the whole state into the controls (used after a screenshot scene changes it). */
function syncControls() {
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  intensitySlider.value = String(state.gradeIntensity);
  setGrade(state.grade.id);
  document.querySelectorAll('#layout-buttons button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.layout === state.layoutId);
  });
  document.querySelectorAll('#caption-position button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pos === state.captionPosition);
  });
  selectPanel(selectedPanel);
  renderPhotoPool();
}

/** The cover as a full-resolution PNG data URL, through the same render the export downloads. */
function renderExportDataUrl() {
  return renderCoverCanvas(state, currentSize).toDataURL('image/png');
}

// ------------------------------------------------------------------ pointer work on the cover

/** A pointer event's position in canvas pixels. */
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const index = panelIndexAtPoint(lastShapes, point.x, point.y);
  if (index < 0) return;
  selectPanel(index);
  drag = { panel: index, lastX: point.x, lastY: point.y };
  try { canvas.setPointerCapture(event.pointerId); } catch { /* synthetic pointers have no capture */ }
  canvas.classList.add('dragging');
  renderPreview();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const slot = state.panels[drag.panel];
  const photo = photoOfSlot(slot);
  const shape = lastShapes[drag.panel];
  if (photo && shape) {
    const r = photoRectInPanel(photo.img, shape.bounds, slot);
    if (r.slackX !== 0) slot.panX = clamp(slot.panX + (2 * (point.x - drag.lastX)) / r.slackX, -1, 1);
    if (r.slackY !== 0) slot.panY = clamp(slot.panY + (2 * (point.y - drag.lastY)) / r.slackY, -1, 1);
  }
  drag.lastX = point.x;
  drag.lastY = point.y;
  renderPreview();
});

function endDrag() {
  drag = null;
  canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const point = canvasPoint(event);
  const index = panelIndexAtPoint(lastShapes, point.x, point.y);
  const target = index >= 0 ? index : selectedPanel;
  const slot = state.panels[target];
  slot.zoom = clamp(slot.zoom * Math.exp(-event.deltaY * 0.0012), 1, 3.5);
  if (target === selectedPanel) zoomSlider.value = String(slot.zoom);
  renderPreview();
}, { passive: false });

// ------------------------------------------------------------------ controls

document.getElementById('photo-files').addEventListener('change', (event) => {
  addPhotoFiles(event.target.files);
  event.target.value = '';
});
document.getElementById('load-samples').addEventListener('click', async () => {
  await ensureSamples();
  renderPreview();
  setStatus('Sample photos loaded');
});

const stage = document.getElementById('stage');
stage.addEventListener('dragover', (event) => {
  event.preventDefault();
  stage.classList.add('dropping');
});
stage.addEventListener('dragleave', () => stage.classList.remove('dropping'));
stage.addEventListener('drop', (event) => {
  event.preventDefault();
  stage.classList.remove('dropping');
  addPhotoFiles(event.dataTransfer.files);
});

document.querySelectorAll('#layout-buttons button').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layoutId = btn.dataset.layout;
    document.querySelectorAll('#layout-buttons button').forEach((b) => b.classList.toggle('active', b === btn));
    selectPanel(selectedPanel);
    renderPreview();
  });
});

document.querySelectorAll('#grade-buttons button').forEach((btn) => {
  btn.addEventListener('click', () => {
    setGrade(btn.dataset.grade);
    renderPreview();
  });
});
intensitySlider.addEventListener('input', () => {
  state.gradeIntensity = Number.parseFloat(intensitySlider.value);
  renderPreview();
});

zoomSlider.addEventListener('input', () => {
  state.panels[selectedPanel].zoom = Number.parseFloat(zoomSlider.value);
  renderPreview();
});
document.getElementById('reset-crop').addEventListener('click', () => {
  Object.assign(state.panels[selectedPanel], { panX: 0, panY: 0, zoom: 1 });
  zoomSlider.value = '1';
  renderPreview();
});

/** Cycles the selected panel through the photo pool by one step. */
function cyclePanelPhoto(step) {
  if (!state.photos.length) return;
  const slot = state.panels[selectedPanel];
  const at = state.photos.findIndex((p) => p.id === slot.photoId);
  const next = state.photos[(at + step + state.photos.length) % state.photos.length];
  assignPhotoToPanel(selectedPanel, next.id);
}
document.getElementById('photo-prev').addEventListener('click', () => cyclePanelPhoto(-1));
document.getElementById('photo-next').addEventListener('click', () => cyclePanelPhoto(1));
document.getElementById('same-photo').addEventListener('click', () => {
  const photoId = state.panels[selectedPanel].photoId;
  state.panels.forEach((slot) => { slot.photoId = photoId; });
  renderPreview();
  setStatus('One photo in every panel — drag each panel to frame it differently');
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  renderPreview();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  renderPreview();
});
document.querySelectorAll('#caption-position button').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.captionPosition = btn.dataset.pos;
    document.querySelectorAll('#caption-position button').forEach((b) => b.classList.toggle('active', b === btn));
    renderPreview();
  });
});

document.querySelectorAll('#size-buttons button').forEach((btn) => {
  btn.addEventListener('click', () => {
    setSize(btn.dataset.size);
    renderPreview();
  });
});
document.getElementById('export-png').addEventListener('click', async () => {
  const blob = await exportCoverPng(state, currentSize);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = coverFileName(currentSize);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  setStatus(`Saved ${coverFileName(currentSize)} (${currentSize.w} × ${currentSize.h})`);
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  const slot = state.panels[selectedPanel];
  const step = 0.06;
  if (event.key === 'ArrowLeft') slot.panX = clamp(slot.panX + step, -1, 1);
  else if (event.key === 'ArrowRight') slot.panX = clamp(slot.panX - step, -1, 1);
  else if (event.key === 'ArrowUp') slot.panY = clamp(slot.panY + step, -1, 1);
  else if (event.key === 'ArrowDown') slot.panY = clamp(slot.panY - step, -1, 1);
  else if (event.key === '+' || event.key === '=') slot.zoom = clamp(slot.zoom * 1.08, 1, 3.5);
  else if (event.key === '-') slot.zoom = clamp(slot.zoom / 1.08, 1, 3.5);
  else return;
  event.preventDefault();
  zoomSlider.value = String(slot.zoom);
  renderPreview();
});

// ------------------------------------------------------------------ start

setSize('landscape');
syncControls();
await ensureSamples();
renderPreview();
setStatus('Sample cover ready — add your own photos or download it as-is');

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  applyShotScene(shot, query, {
    state,
    setSize,
    setGrade,
    selectPanel,
    syncControls,
    renderPreview,
    renderExportDataUrl,
  });
}
