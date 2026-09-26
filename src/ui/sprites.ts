// Sprite pane: one tile per sprite plus the stage, and "add sprite".

import { SPRITES } from '../assets/library'
import { expandProject } from '../format/json'
import { spriteJSON } from '../format/default'
import { lang, t } from '../i18n'
import type { Profile } from '../profiles'
import type { VirtualMachine } from '../engine'
import { promptDialog } from './dialogs'

interface Callbacks {
  select(targetId: string): void
  added(): void
}

export class SpritePane {
  readonly element: HTMLElement
  private vm: VirtualMachine | null = null
  private profile: Profile
  private callbacks: Callbacks
  private thumbnails = new Map<string, string>()

  constructor(profile: Profile, callbacks: Callbacks) {
    this.profile = profile
    this.callbacks = callbacks
    this.element = document.createElement('div')
    this.element.className = 'ls-sprites'
  }

  attach(vm: VirtualMachine) {
    this.vm = vm
    vm.on('targetsUpdate', () => this.render())
  }

  private thumbnail(target: any): string {
    const costume = target.getCostumes()[target.currentCostume]
    const key = costume?.assetId
    if (!key) return ''
    if (!this.thumbnails.has(key)) {
      try {
        this.thumbnails.set(key, costume.asset.encodeDataURI())
      } catch {
        this.thumbnails.set(key, '')
      }
    }
    return this.thumbnails.get(key)!
  }

  render() {
    const vm = this.vm
    if (!vm) return
    const targets = vm.runtime.targets.filter((t: any) => t.isOriginal)
    const editing = vm.editingTarget?.id

    // Stage 1/2 only have one sprite: the pane would just be noise.
    if (!this.profile.sprites && targets.filter((t: any) => !t.isStage).length <= 1) {
      this.element.hidden = true
      return
    }
    this.element.hidden = false
    this.element.replaceChildren()

    const sorted = [...targets.filter((t: any) => !t.isStage), ...targets.filter((t: any) => t.isStage)]

    for (const target of sorted) {
      const tile = document.createElement('button')
      tile.type = 'button'
      tile.className = 'ls-sprite' + (target.id === editing ? ' ls-selected' : '')
      tile.title = target.isStage ? t('stage') : target.getName()

      const img = document.createElement('img')
      img.src = this.thumbnail(target)
      img.alt = ''
      const label = document.createElement('span')
      label.textContent = target.isStage ? t('stage') : target.getName()
      tile.append(img, label)

      tile.onclick = () => this.callbacks.select(target.id)
      if (!target.isStage && this.profile.sprites) {
        tile.ondblclick = async () => {
          const name = await promptDialog(this.element, target.getName(), target.getName())
          if (name) vm.renameSprite(target.id, name)
        }
        tile.oncontextmenu = (e) => {
          e.preventDefault()
          if (confirm(`${t('deleteSprite')}: ${target.getName()}?`)) vm.deleteSprite(target.id)
        }
      }
      this.element.appendChild(tile)
    }

    if (this.profile.sprites) {
      const add = document.createElement('button')
      add.type = 'button'
      add.className = 'ls-sprite ls-add'
      add.title = t('addSprite')
      add.textContent = '+'
      add.onclick = () => this.addSprite()
      this.element.appendChild(add)
    }
  }

  private async addSprite() {
    const vm = this.vm
    if (!vm) return
    const keys = Object.keys(SPRITES)
    const key = keys[0]
    const sprite = SPRITES[key]
    const json = spriteJSON(sprite.name[lang()], sprite.costumes, sprite.sounds)
    const [expanded] = expandProject({ targets: [json] }).targets
    await vm.addSprite(JSON.stringify(expanded))
    this.callbacks.added()
  }
}
