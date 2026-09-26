// scratch-blocks loads its icons (green flag, arrows, …) by URL. LiaScript
// loads template scripts as blob: URLs, so a path relative to the bundle is
// unknown — a pinned jsDelivr copy is used unless `window.LiaScratchMedia`
// points somewhere else (e.g. for offline use).

declare global {
  interface Window {
    LiaScratchMedia?: string
  }
}

export function mediaPath(): string {
  return window.LiaScratchMedia || 'https://cdn.jsdelivr.net/npm/scratch-blocks@2.1.19/media/'
}
