// Creates a Scratch VM with renderer, audio and a storage that serves the
// built-in asset library plus any embedded (data-URI) assets of a project.

import VM from '@scratch/scratch-vm'
import Renderer from '@scratch/scratch-render'
import { ScratchStorage } from '@scratch/scratch-storage'
import AudioEngine from 'scratch-audio'

import { BACKDROPS, COSTUMES, SOUNDS } from './assets/library'

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
  const { AssetType } = storage

  for (const costume of [...Object.values(COSTUMES), ...Object.values(BACKDROPS)]) {
    const data = typeof costume.data === 'string' ? encoder.encode(costume.data) : costume.data
    const type = costume.dataFormat === 'svg' ? AssetType.ImageVector : AssetType.ImageBitmap
    const md5 = String(storage.cache(type, costume.dataFormat as any, data, null as any))
    libraryIds.byMd5.set(md5, costume.key)
    libraryIds.byKey.set(costume.key, md5)
  }

  for (const sound of Object.values(SOUNDS)) {
    const md5 = String(storage.cache(AssetType.Sound, 'wav' as any, sound.data, null as any))
    libraryIds.byMd5.set(md5, sound.key)
    libraryIds.byKey.set(sound.key, md5)
  }

  return storage
}

/** Stores embedded asset data (base64) and returns its md5 asset id. */
export function storeEmbeddedAsset(dataFormat: string, base64: string): string {
  const s = getStorage()
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const type =
    dataFormat === 'svg'
      ? s.AssetType.ImageVector
      : dataFormat === 'wav' || dataFormat === 'mp3'
        ? s.AssetType.Sound
        : s.AssetType.ImageBitmap
  return String(s.cache(type, dataFormat as any, bytes, null as any))
}

/** Returns the raw bytes of a cached asset, if available. */
export function getAssetData(assetId: string): Uint8Array | null {
  const asset = getStorage().get(assetId)
  return asset ? (asset.data as Uint8Array) : null
}

let audioEngine: any = null

export function createEngine(canvas: HTMLCanvasElement): { vm: VirtualMachine; renderer: any } {
  const vm = new VM()
  const renderer = new Renderer(canvas)

  vm.attachRenderer(renderer)
  vm.attachStorage(getStorage())

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
