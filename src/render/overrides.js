const EMPTY_MANIFEST = Object.freeze({ faces: {}, sfx: {} });

let _manifest = { faces: {}, sfx: {} };
let _loaded = false;
let _loadPromise = null;
const _faceImages = new Map();
const _sfxArrayBuffers = new Map();
const _listeners = new Set();

function isValidPath(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function loadImage(src) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function getOverridesManifest() {
  return _manifest;
}

export function getFaceOverrideImage(charId) {
  return _faceImages.get(charId) ?? null;
}

export function getSfxOverrideBytes(cueKey) {
  return _sfxArrayBuffers.get(cueKey) ?? null;
}

export function onOverridesLoaded(fn) {
  if (typeof fn !== 'function') return () => {};
  _listeners.add(fn);
  if (_loaded) fn(_manifest);
  return () => _listeners.delete(fn);
}

export function resetOverridesForTest(customManifest = null) {
  _manifest = customManifest
    ? {
        faces: { ...(customManifest.faces || {}) },
        sfx: { ...(customManifest.sfx || {}) },
      }
    : { faces: {}, sfx: {} };
  _faceImages.clear();
  _sfxArrayBuffers.clear();
  _loaded = Boolean(customManifest);
  _loadPromise = null;
}

/**
 * Reads `./overrides.json` once at boot. When `faces` and `sfx` are empty objects,
 * zero extra network requests are made (zero 404 console spam).
 */
export async function loadAssetOverrides(fetchImpl = globalThis.fetch) {
  if (_loaded) return _manifest;
  if (_loadPromise) return _loadPromise;

  if (typeof fetchImpl !== 'function') {
    _manifest = { faces: {}, sfx: {} };
    _loaded = true;
    return EMPTY_MANIFEST;
  }

  _loadPromise = (async () => {
    try {
      const res = await fetchImpl('./overrides.json', { cache: 'no-cache' });
      if (!res || !res.ok) {
        _manifest = { faces: {}, sfx: {} };
        _loaded = true;
        return _manifest;
      }
      const parsed = await res.json();
      const faces = parsed && typeof parsed.faces === 'object' && parsed.faces ? parsed.faces : {};
      const sfx = parsed && typeof parsed.sfx === 'object' && parsed.sfx ? parsed.sfx : {};
      _manifest = { faces: {}, sfx: {} };

      const tasks = [];
      for (const [charId, url] of Object.entries(faces)) {
        if (!isValidPath(url)) continue;
        const cleanUrl = url.trim();
        _manifest.faces[charId] = cleanUrl;
        tasks.push(
          loadImage(cleanUrl).then((img) => {
            if (img) _faceImages.set(charId, img);
          }),
        );
      }

      for (const [cueKey, url] of Object.entries(sfx)) {
        if (!isValidPath(url)) continue;
        const cleanUrl = url.trim();
        _manifest.sfx[cueKey] = cleanUrl;
        tasks.push(
          fetchImpl(cleanUrl)
            .then((r) => (r && r.ok ? r.arrayBuffer() : null))
            .then((buf) => {
              if (buf && buf.byteLength > 0) _sfxArrayBuffers.set(cueKey, buf);
            })
            .catch(() => {}),
        );
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    } catch {
      _manifest = { faces: {}, sfx: {} };
    }

    _loaded = true;
    for (const fn of _listeners) {
      try {
        fn(_manifest);
      } catch {
        // ignore listener error
      }
    }
    return _manifest;
  })();

  return _loadPromise;
}
