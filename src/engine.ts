// Creates a Scratch VM with renderer, audio and a storage that serves the
// asset library (built-in and registered by the course) plus any embedded
// (data-URI) assets of a project.

import VM from '@scratch/scratch-vm'
import Renderer from '@scratch/scratch-render'
import { ScratchStorage } from '@scratch/scratch-storage'
import AudioEngine from 'scratch-audio'

import { BACKDROPS, COSTUMES, SOUNDS, type LibraryCostume, type LibrarySound } from './assets/library'

export type VirtualMachine = any

const encoder = new TextEncoder()

let storage: ScratchStorage | null = null

/** md5 → library key, and library key → md5 */
export const libraryIds = {
  byMd5: new Map<string, string>(),
  byKey: new Map<string, string>(),
}

/** The storage is shared by all engines on the page. */
export function getStorage(): ScratchStorage {
  if (storage) return storage

  storage = new ScratchStorage()
  for (const entry of [...Object.values(COSTUMES), ...Object.values(BACKDROPS), ...Object.values(SOUNDS)]) {
    cacheLibraryAsset(entry)
  }
  return storage
}

function assetType(s: ScratchStorage, dataFormat: string) {
  return dataFormat === 'svg'
    ? s.AssetType.ImageVector
    : dataFormat === 'wav' || dataFormat === 'mp3'
      ? s.AssetType.Sound
      : s.AssetType.ImageBitmap
}

/**
 * Caches a library asset (built-in or registered by a course) and links its
 * md5 to its key. Returns the md5.
 */
export function cacheLibraryAsset(entry: LibraryCostume | LibrarySound): string {
  const s = getStorage()
  const data = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data
  const md5 = String(s.cache(assetType(s, entry.dataFormat), entry.dataFormat as any, data, null as any))
  // a redefined key must not keep its old md5 → key mapping
  const old = libraryIds.byKey.get(entry.key)
  if (old && old !== md5 && libraryIds.byMd5.get(old) === entry.key) libraryIds.byMd5.delete(old)
  libraryIds.byMd5.set(md5, entry.key)
  libraryIds.byKey.set(entry.key, md5)
  return md5
}

/** Stores embedded asset data (base64) and returns its md5 asset id. */
export function storeEmbeddedAsset(dataFormat: string, base64: string): string {
  const s = getStorage()
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return String(s.cache(assetType(s, dataFormat), dataFormat as any, bytes, null as any))
}

/** Returns the raw bytes of a cached asset, if available. */
export function getAssetData(assetId: string): Uint8Array | null {
  const asset = getStorage().get(assetId)
  return asset ? (asset.data as Uint8Array) : null
}

/**
 * The two methods of scratch-svg-renderer's BitmapAdapter the VM uses, without
 * bundling that package a second time (scratch-render brings its own copy).
 */
const bitmapAdapter = {
  /** nearest-neighbor scaling, in two steps like the original */
  resize(image: CanvasImageSource & { width: number; height: number }, width: number, height: number) {
    const stretch = (source: CanvasImageSource, w: number, h: number) => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(source, 0, 0, w, h)
      return canvas
    }
    return stretch(stretch(image, width, image.height), width, height)
  },
  convertDataURIToBinary(dataURI: string): Uint8Array {
    const base64 = dataURI.slice(dataURI.indexOf(',') + 1)
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  },
}

let audioEngine: any = null

export function createEngine(canvas: HTMLCanvasElement): { vm: VirtualMachine; renderer: any } {
  const vm = new VM()
  const renderer = new Renderer(canvas)

  vm.attachRenderer(renderer)
  vm.attachStorage(getStorage())
  // without it, the VM cannot load any bitmap (png/jpg) costume
  vm.attachV2BitmapAdapter(bitmapAdapter)

  // A single AudioContext is shared, browsers limit how many can exist.
  if (!audioEngine) audioEngine = new AudioEngine()
  vm.attachAudioEngine(audioEngine)

  vm.setCompatibilityMode(true)
  vm.start()
  renderer.draw()

  return { vm, renderer }
}

/** Releases the WebGL context, since browsers only allow a handful at once. */
export function destroyEngine(vm: VirtualMachine, renderer: any) {
  try {
    vm.stopAll()
    vm.runtime.quit?.()
    vm.quit?.()
  } catch (e) {
    console.warn('LiaScratch: stopping vm', e)
  }
  try {
    renderer.gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch (e) {
    console.warn('LiaScratch: releasing renderer', e)
  }
}
