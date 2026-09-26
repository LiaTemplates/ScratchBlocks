// Built-in, freely licensed asset library (see ATTRIBUTION.md).
//
// Assets are addressed by a stable, language-neutral key (e.g. "robo-a").
// When an engine starts, every asset is cached in scratch-storage, which
// computes its md5 — this md5 is what ends up as `assetId` in project.json.

import roboA from 'bundle-text:./sprites/robo-a.svg'
import roboB from 'bundle-text:./sprites/robo-b.svg'
import white from 'bundle-text:./backdrops/white.svg'
import { tone } from './sounds'

export interface LibraryCostume {
  key: string
  dataFormat: 'svg' | 'png'
  data: string | Uint8Array
  rotationCenterX: number
  rotationCenterY: number
}

export interface LibrarySound {
  key: string
  dataFormat: 'wav'
  data: Uint8Array
  rate: number
  sampleCount: number
}

export interface LibrarySprite {
  /** default name of the sprite */
  name: string
  costumes: string[]
  sounds: string[]
}

export const COSTUMES: Record<string, LibraryCostume> = {
  'robo-a': { key: 'robo-a', dataFormat: 'svg', data: roboA, rotationCenterX: 40, rotationCenterY: 50 },
  'robo-b': { key: 'robo-b', dataFormat: 'svg', data: roboB, rotationCenterX: 40, rotationCenterY: 50 },
}

export const BACKDROPS: Record<string, LibraryCostume> = {
  white: { key: 'white', dataFormat: 'svg', data: white, rotationCenterX: 240, rotationCenterY: 180 },
}

export const SOUNDS: Record<string, LibrarySound> = {
  pop: tone('pop', [[660, 0.04], [440, 0.08]]),
  beep: tone('beep', [[880, 0.2]]),
}

export const SPRITES: Record<string, LibrarySprite> = {
  robo: { name: 'Robo', costumes: ['robo-a', 'robo-b'], sounds: ['pop'] },
}

export const DEFAULT_SPRITE = 'robo'
export const DEFAULT_BACKDROP = 'white'
