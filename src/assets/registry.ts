// Costumes, backdrops, sounds and sprites of the course itself, registered in
// its @onload with window.LiaScratch.defineAsset / defineSprite:
//
//   defineAsset("dschungel", { type: "backdrop", url: "assets/dschungel.png" })
//   defineSprite("kristall", { name: "Kristall", costumes: ["kristall"] })
//
// Registered assets become library entries like the built-in ones: they are
// addressed by their key in the text format and in checks. Loading runs in
// the background; ProjectModel.load waits for it (assetsReady).
//
// Bitmaps are stored with bitmapResolution 2: the VM re-encodes all other
// bitmaps on load (new md5), and those could no longer be written as text.

import { BACKDROPS, COSTUMES, SOUNDS, SPRITES, type LibraryCostume, type LibrarySound } from './library'
import { cacheLibraryAsset } from '../engine'

export type AssetType = 'costume' | 'backdrop' | 'sound'
type Format = 'svg' | 'png' | 'jpg' | 'gif' | 'webp' | 'wav' | 'mp3'

export interface AssetSpec {
  type: AssetType
  /** http(s), relative (to the course) or data: URL */
  url?: string
  /** inline SVG markup */
  svg?: string
  /** only needed if neither the content nor the URL tell the format */
  format?: 'svg' | 'png' | 'jpg' | 'wav' | 'mp3'
  /** in pixels of the image; unset: centre of the image */
  rotationCenterX?: number
  rotationCenterY?: number
  /** 2: the image has double resolution (like Scratch's own bitmaps) */
  bitmapResolution?: 1 | 2
}

export interface SpriteSpec {
  /** name of the sprite, default: the key */
  name?: string
  costumes: string[]
  sounds?: string[]
}

const KEY = /^[\p{L}\p{N}_-]+$/u

// keys of the template itself, which courses cannot replace
const BUILT_IN = new Set([...Object.keys(COSTUMES), ...Object.keys(BACKDROPS), ...Object.keys(SOUNDS)])
const BUILT_IN_SPRITES = new Set(Object.keys(SPRITES))

const pending = new Set<Promise<void>>()
const errors = new Map<string, string>()
const listeners = new Set<() => void>()

function checkKey(key: string, builtIn: Set<string>) {
  if (typeof key !== 'string' || !KEY.test(key)) {
    throw new Error(`LiaScratch: invalid key "${key}" (letters, digits, "_" and "-" only)`)
  }
  if (builtIn.has(key)) throw new Error(`LiaScratch: "${key}" is built in and cannot be redefined`)
}

/**
 * Registers a costume, backdrop or sound under `key`. Loading runs in the
 * background; the returned promise never rejects, errors are kept for
 * assetError and shown where the key is used.
 */
export function defineAsset(key: string, spec: AssetSpec): Promise<void> {
  checkKey(key, BUILT_IN)
  const promise = loadAsset(key, spec)
    .then((entry) => register(key, spec.type, entry))
    .catch((e: any) => {
      const message = String(e?.message || e)
      errors.set(key, message)
      console.error(`LiaScratch: asset "${key}":`, message)
      listeners.forEach((fn) => fn())
    })
  pending.add(promise)
  promise.finally(() => pending.delete(promise))
  return promise
}

/** Registers a sprite preset, used for new sprites named like it or its key. */
export function defineSprite(key: string, spec: SpriteSpec): void {
  checkKey(key, BUILT_IN_SPRITES)
  if (!spec || !Array.isArray(spec.costumes) || !spec.costumes.length) {
    throw new Error(`LiaScratch: sprite "${key}" needs at least one costume`)
  }
  // the keys of costumes and sounds are checked when a project uses them
  SPRITES[key] = { name: spec.name ?? key, costumes: [...spec.costumes], sounds: [...(spec.sounds ?? [])] }
}

/** Resolves once all registered assets are loaded (or failed). */
export async function assetsReady(): Promise<void> {
  while (pending.size) await Promise.allSettled([...pending])
}

/** Why the asset `key` could not be loaded, if it failed. */
export function assetError(key: string): string | undefined {
  return errors.get(key)
}

/** Calls `fn` whenever an asset was loaded or failed; returns an unsubscribe. */
export function onAssetsChanged(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function register(key: string, type: AssetType, entry: LibraryCostume | LibrarySound) {
  // a custom key may change its type when redefined
  delete COSTUMES[key]
  delete BACKDROPS[key]
  delete SOUNDS[key]
  if (type === 'sound') SOUNDS[key] = entry as LibrarySound
  else if (type === 'backdrop') BACKDROPS[key] = entry as LibraryCostume
  else COSTUMES[key] = entry as LibraryCostume
  cacheLibraryAsset(entry)
  errors.delete(key)
  listeners.forEach((fn) => fn())
}

// --- loading ------------------------------------------------------------------

async function loadAsset(key: string, spec: AssetSpec): Promise<LibraryCostume | LibrarySound> {
  if (!spec || !['costume', 'backdrop', 'sound'].includes(spec.type)) {
    throw new Error('type must be "costume", "backdrop" or "sound"')
  }
  if (!spec.svg && !spec.url) throw new Error('"url" or "svg" is missing')

  let bytes: Uint8Array
  if (spec.svg) {
    bytes = new TextEncoder().encode(spec.svg)
  } else {
    const r = await fetch(resolveUrl(spec.url!))
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    bytes = new Uint8Array(await r.arrayBuffer())
  }

  const format: Format | undefined =
    spec.format ?? (spec.svg ? 'svg' : sniffFormat(bytes) ?? formatFromUrl(spec.url!))
  if (!format) throw new Error('unknown file format')

  if (spec.type === 'sound') {
    if (format !== 'wav' && format !== 'mp3') throw new Error(`a sound must be wav or mp3, not ${format}`)
    return { key, dataFormat: format, data: bytes }
  }

  if (format === 'svg') {
    return {
      key,
      dataFormat: 'svg',
      data: new TextDecoder().decode(bytes),
      rotationCenterX: spec.rotationCenterX,
      rotationCenterY: spec.rotationCenterY,
    }
  }
  if (format === 'wav' || format === 'mp3') throw new Error(`a ${spec.type} must be an image, not ${format}`)
  return loadBitmap(key, spec, bytes, format)
}

/**
 * Bitmaps are stored as the VM keeps them: with double resolution. Images
 * count as stage pixels (resolution 1), except backdrops of at least 960 px.
 */
async function loadBitmap(key: string, spec: AssetSpec, bytes: Uint8Array, format: Format): Promise<LibraryCostume> {
  const image = await createImageBitmap(new Blob([bytes as BlobPart]))
  const { width, height } = image
  const res = spec.bitmapResolution ?? (spec.type === 'backdrop' && width >= 960 ? 2 : 1)
  const scale = 2 / res

  let data = bytes
  let dataFormat: 'png' | 'jpg' = format === 'jpg' ? 'jpg' : 'png'
  if (res !== 2 || (format !== 'png' && format !== 'jpg')) {
    data = await drawPng(image, Math.round(width * scale), Math.round(height * scale))
    dataFormat = 'png'
  }
  image.close?.()

  return {
    key,
    dataFormat,
    data,
    rotationCenterX: spec.rotationCenterX !== undefined ? spec.rotationCenterX * scale : (width * scale) / 2,
    rotationCenterY: spec.rotationCenterY !== undefined ? spec.rotationCenterY * scale : (height * scale) / 2,
  }
}

async function drawPng(image: ImageBitmap, width: number, height: number): Promise<Uint8Array> {
  let blob: Blob | null
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(image, 0, 0, width, height)
    blob = await canvas.convertToBlob({ type: 'image/png' })
  } else {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(image, 0, 0, width, height)
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  }
  if (!blob) throw new Error('image could not be converted')
  return new Uint8Array(await blob.arrayBuffer())
}

/** Detects the format from the first bytes (servers often send the wrong type). */
export function sniffFormat(bytes: Uint8Array): Format | undefined {
  const at = (offset: number, ...values: number[]) => values.every((v, i) => bytes[offset + i] === v)
  const ascii = (offset: number, s: string) => at(offset, ...[...s].map((c) => c.charCodeAt(0)))

  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return 'png'
  if (at(0, 0xff, 0xd8, 0xff)) return 'jpg'
  if (ascii(0, 'GIF8')) return 'gif'
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'webp'
  if (ascii(0, 'RIFF') && ascii(8, 'WAVE')) return 'wav'
  if (ascii(0, 'ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return 'mp3'
  const head = new TextDecoder().decode(bytes.subarray(0, 4096))
  if (head.includes('<svg')) return 'svg'
  return undefined
}

function formatFromUrl(url: string): Format | undefined {
  if (url.startsWith('data:')) {
    const mime = /^data:([^;,]+)/.exec(url)?.[1] ?? ''
    return ({
      'image/svg+xml': 'svg',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/mpeg': 'mp3',
    } as Record<string, Format>)[mime]
  }
  const ext = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(url)?.[1]?.toLowerCase()
  return ext === 'jpeg' ? 'jpg' : (['svg', 'png', 'jpg', 'gif', 'webp', 'wav', 'mp3'] as Format[]).find((f) => f === ext)
}

/**
 * Absolute and data: URLs stay as they are. Relative URLs are resolved
 * against the course: the LiaScript viewer and the devserver show it as
 * "?<URL of the README>"; otherwise against the page itself (best effort).
 */
export function resolveUrl(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url
  let base = typeof document !== 'undefined' ? document.baseURI : undefined
  if (typeof location !== 'undefined') {
    try {
      const course = decodeURIComponent(location.search.slice(1))
      if (/^https?:\/\//.test(course)) base = course
    } catch {
      // malformed query, keep the page itself
    }
  }
  return base ? new URL(url, base).href : url
}
