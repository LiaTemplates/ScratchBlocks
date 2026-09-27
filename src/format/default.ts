// Builders for empty stages and sprites (library assets referenced by key).

import { DEFAULT_BACKDROP, DEFAULT_SPRITE, SPRITES, type LibrarySprite } from '../assets/library'

export function stageJSON(backdrops: string[] = [DEFAULT_BACKDROP]) {
  return {
    isStage: true,
    name: 'Stage',
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: 0,
    costumes: backdrops.map((key) => ({ name: key, asset: key })),
    sounds: [],
    volume: 100,
    layerOrder: 0,
    tempo: 60,
    videoTransparency: 50,
    videoState: 'on',
    textToSpeechLanguage: null,
  }
}

export function spriteJSON(name: string, costumes: string[], sounds: string[], layerOrder = 1) {
  return {
    isStage: false,
    name,
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: 0,
    costumes: costumes.map((key) => ({ name: key, asset: key })),
    sounds: sounds.map((key) => ({ name: key, asset: key })),
    volume: 100,
    layerOrder,
    visible: true,
    x: 0,
    y: 0,
    size: 100,
    direction: 90,
    draggable: false,
    rotationStyle: 'all around',
  }
}

/**
 * Costumes and sounds a new sprite gets: those of the preset with the same
 * name (or key, e.g. one defined by the course), otherwise Robo's.
 */
export function spritePreset(name: string): LibrarySprite {
  return (
    Object.values(SPRITES).find((s) => s.name === name) ??
    (Object.hasOwn(SPRITES, name.toLowerCase()) ? SPRITES[name.toLowerCase()] : SPRITES[DEFAULT_SPRITE])
  )
}

export function defaultSpriteJSON(layerOrder = 1) {
  const sprite = spritePreset(SPRITES[DEFAULT_SPRITE].name)
  return spriteJSON(sprite.name, sprite.costumes, sprite.sounds, layerOrder)
}
