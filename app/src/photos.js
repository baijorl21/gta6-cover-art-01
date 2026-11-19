// Loading photos: the person's own files (read locally, never uploaded) and the two sample
// photos bundled with the app for an instant demo.

/** The bundled sample photos, AI-made for this app and free to use. */
export const SAMPLE_PHOTOS = [
  { id: 'sample-boulevard', name: 'Boulevard sunset', src: 'samples/boulevard.jpg' },
  { id: 'sample-pier', name: 'Pier at noon', src: 'samples/pier.jpg' },
];

/** Loads an image from a URL (a local file of the app, or an object URL), resolving once drawable. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Loads one of the person's own image files into a pool entry, read on their machine only. */
export async function loadPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  return { id: `photo-${crypto.randomUUID()}`, name: file.name, img, thumb: url };
}

/** Loads a bundled sample photo into a pool entry. */
export async function loadSamplePhoto(sample) {
  const img = await loadImage(sample.src);
  return { id: sample.id, name: sample.name, img, thumb: sample.src };
}

/** Loads every bundled sample, in order. */
export async function loadAllSamples() {
  const photos = [];
  for (const sample of SAMPLE_PHOTOS) photos.push(await loadSamplePhoto(sample));
  return photos;
}
