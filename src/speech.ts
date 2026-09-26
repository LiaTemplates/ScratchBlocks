// Reads block texts aloud for children who cannot read (yet).

import { lang } from './i18n'

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ').trim())
  utterance.lang = lang() === 'de' ? 'de-DE' : 'en-US'
  utterance.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}
