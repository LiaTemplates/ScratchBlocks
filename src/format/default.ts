// Builders for empty stages and sprites (library assets referenced by key).

import { DEFAULT_BACKDROP, DEFAULT_SPRITE, SPRITES } from '../assets/library'

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

export function defaultSpriteJSON(layerOrder = 1) {
  const sprite = SPRITES[DEFAULT_SPRITE]
  return spriteJSON(sprite.name, sprite.costumes, sprite.sounds, layerOrder)
}
