// Entry point: registers <lia-scratch> and window.LiaScratch, which the
// macros in README.md call from their <script> tags.

import css from 'bundle-text:./ui/style.css'
import { LiaScratchElement, type Send } from './element'
import { createCheckApi } from './check'
import { defineProfile } from './profiles'
import { defineAsset, defineSprite } from './assets/registry'
import { t } from './i18n'
import { guardBody } from './dom-guard'
import { renderBlocks } from './blockimage'
import { speak } from './speech'

function element(id: string): LiaScratchElement {
  const el = document.getElementById(id)
  if (!(el instanceof LiaScratchElement)) throw new Error(`<lia-scratch id="${id}"> not found`)
  return el
}

const LiaScratch = {
  /** ▶ of a Scratch code block: runs the project until all scripts end. */
  run(id: string, send: Send, code: string): string {
    element(id)
      .run(send, code)
      .catch((e) => {
        send.lia(String(e?.message || e), [], false)
        send.lia('LIA: stop')
      })
    return 'LIA: wait'
  },

  /** ▶ of a task: loads the project and runs the teacher's check on it. */
  check(id: string, send: Send, code: string, _profile: string, fn: (api: any) => Promise<void>): string {
    const el = element(id)
    ;(async () => {
      await el.run(send, code, { untilDone: false })
      const { api, failures } = createCheckApi(el)
      try {
        await fn(api)
      } catch (e: any) {
        el.vm.stopAll()
        send.lia(`${t('checkError')} ${e?.message || e}`, [], false)
        el.finish()
        return
      }
      if (failures.length) {
        send.lia(`${t('failed')}\n${failures.map((f) => '• ' + f).join('\n')}`, [], false)
      } else {
        send.lia(`✔ ${t('passed')}`, [], true)
      }
      // profiles for young children read the result aloud: the first hint is
      // the most visible observation, more would be too much to listen to
      if (el.profile.speech) {
        speak(failures.length ? `${t('failed').replace(/:$/, '.')} ${failures[0]}` : t('passed'))
      }
      el.finish()
    })().catch((e) => {
      send.lia(String(e?.message || e), [], false)
      send.lia('LIA: stop')
    })
    return 'LIA: wait'
  },

  /** Registers a custom profile, used with @Scratch.profil(name). */
  defineProfile,

  /** Registers a costume, backdrop or sound of the course, used by its key. */
  defineAsset,

  /** Registers a sprite preset: costumes and sounds of new sprites with its name. */
  defineSprite,

  /** A static picture of blocks (@Scratch.blocks) as SVG markup. */
  blocks(code: string, scale?: number): string {
    return renderBlocks(code, scale)
  },
}

declare global {
  interface Window {
    LiaScratch: typeof LiaScratch
    LiaScratchSetup?: Array<(api: typeof LiaScratch) => void> | { push: (fn: (api: typeof LiaScratch) => void) => void }
  }
}

if (!customElements.get('lia-scratch')) {
  guardBody()
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  window.LiaScratch = LiaScratch

  // A course's @onload may run before this script is loaded. It can queue its
  // definitions (assets, sprites, profiles) in window.LiaScratchSetup; they
  // run here, before any <lia-scratch> starts. Later pushes run at once.
  const setup = (fn: (api: typeof LiaScratch) => void) => {
    try {
      fn(LiaScratch)
    } catch (e) {
      console.error('LiaScratch setup:', e)
    }
  }
  const queued = window.LiaScratchSetup
  if (Array.isArray(queued)) queued.forEach(setup)
  window.LiaScratchSetup = { push: setup }

  customElements.define('lia-scratch', LiaScratchElement)
}
