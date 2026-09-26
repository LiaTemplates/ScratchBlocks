// Tiny synthesized sounds, generated at runtime instead of shipping audio
// files. The output is deterministic, so the md5 asset ids stay stable.

import type { LibrarySound } from './library'

const RATE = 22050

/** Builds a mono 16-bit WAV from a sequence of [frequency, seconds] notes. */
export function tone(key: string, notes: [number, number][]): LibrarySound {
  const samples: number[] = []
  for (const [freq, secs] of notes) {
    const n = Math.round(secs * RATE)
    for (let i = 0; i < n; i++) {
      const fade = Math.min(1, i / 200, (n - i) / 400)
      samples.push(Math.sin((2 * Math.PI * freq * i) / RATE) * 0.5 * fade)
    }
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const str = (offset: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))

  str(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  str(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.round(s * 32767), true))

  return { key, dataFormat: 'wav', data: new Uint8Array(buffer), rate: RATE, sampleCount: samples.length }
}
