// Entry point: registers <lia-scratch> and window.LiaScratch, which the
// macros in README.md call from their <script> tags.

import css from 'bundle-text:./ui/style.css'
import { LiaScratchElement, type Send } from './element'
import { createCheckApi } from './check'
import { defineProfile } from './profiles'
import { t } from './i18n'
import { guardBody } from './dom-guard'

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
      el.finish()
    })().catch((e) => {
      send.lia(String(e?.message || e), [], false)
      send.lia('LIA: stop')
    })
    return 'LIA: wait'
  },

  /** Registers a custom profile, used with @Scratch.profil(name). */
  defineProfile,
}

declare global {
  interface Window {
    LiaScratch: typeof LiaScratch
  }
}

if (!customElements.get('lia-scratch')) {
  guardBody()
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  customElements.define('lia-scratch', LiaScratchElement)
  window.LiaScratch = LiaScratch
}
