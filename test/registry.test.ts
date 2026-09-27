import { afterEach, describe, expect, it, vi } from 'vitest'

// The library assets are bundle-text imports; the md5 ids are irrelevant here.
vi.mock('../src/engine', () => ({ cacheLibraryAsset: vi.fn(() => 'md5') }))
vi.mock('../src/assets/library', async () => {
  const svg = (key: string) => ({ key, dataFormat: 'svg', data: '<svg/>', rotationCenterX: 40, rotationCenterY: 50 })
  const wav = (key: string) => ({ key, dataFormat: 'wav', data: new Uint8Array(), rate: 22050, sampleCount: 1 })
  return {
    COSTUMES: { 'robo-a': svg('robo-a'), 'robo-b': svg('robo-b') },
    BACKDROPS: { white: svg('white') },
    SOUNDS: { pop: wav('pop'), beep: wav('beep') },
    SPRITES: { robo: { name: 'Robo', costumes: ['robo-a', 'robo-b'], sounds: ['pop'] } },
    DEFAULT_SPRITE: 'robo',
    DEFAULT_BACKDROP: 'white',
  }
})

const { cacheLibraryAsset } = await import('../src/engine')
const { BACKDROPS, COSTUMES, SOUNDS, SPRITES } = await import('../src/assets/library')
const { assetError, assetsReady, defineAsset, defineSprite, onAssetsChanged, resolveUrl, sniffFormat } = await import(
  '../src/assets/registry'
)

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30"/></svg>'
const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((v) => (typeof v === 'string' ? [...v].map((c) => c.charCodeAt(0)) : [v])))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('keys', () => {
  it('accepts letters of any language, digits, "_" and "-"', async () => {
    await defineAsset('Kätzchen_2-b', { type: 'costume', svg })
    expect(COSTUMES['Kätzchen_2-b']).toBeDefined()
  })

  it('rejects other characters', () => {
    for (const key of ['', 'a b', 'a,b', 'a*', 'a.svg']) {
      expect(() => defineAsset(key, { type: 'costume', svg })).toThrow(/invalid key/)
    }
    expect(() => defineSprite('a b', { costumes: ['robo-a'] })).toThrow(/invalid key/)
  })

  it('protects the built-in assets and sprites', () => {
    for (const key of ['robo-a', 'robo-b', 'white', 'pop', 'beep']) {
      expect(() => defineAsset(key, { type: 'costume', svg })).toThrow(/built in/)
    }
    expect(() => defineSprite('robo', { costumes: ['robo-a'] })).toThrow(/built in/)
  })

  it('replaces a custom key, also with another type', async () => {
    await defineAsset('wechsel', { type: 'costume', svg })
    await defineAsset('wechsel', { type: 'backdrop', svg })
    expect(COSTUMES.wechsel).toBeUndefined()
    expect(BACKDROPS.wechsel).toBeDefined()
  })
})

describe('format', () => {
  it('is detected from the content', () => {
    expect(sniffFormat(bytes(0x89, 'PNG', 13, 10))).toBe('png')
    expect(sniffFormat(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpg')
    expect(sniffFormat(bytes('GIF89a'))).toBe('gif')
    expect(sniffFormat(bytes('RIFF', 0, 0, 0, 0, 'WEBPVP8 '))).toBe('webp')
    expect(sniffFormat(bytes('RIFF', 0, 0, 0, 0, 'WAVEfmt '))).toBe('wav')
    expect(sniffFormat(bytes('ID3', 4, 0))).toBe('mp3')
    expect(sniffFormat(bytes(0xff, 0xfb, 0x90, 0x00))).toBe('mp3')
    expect(sniffFormat(new TextEncoder().encode('<?xml version="1.0"?>\n' + svg))).toBe('svg')
    expect(sniffFormat(bytes('hello'))).toBeUndefined()
  })

  it('wins over the type the server sends', async () => {
    // e.g. raw.githubusercontent.com serves svg as text/plain
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(svg, { headers: { 'content-type': 'text/plain' } }))
    await defineAsset('vom-server', { type: 'costume', url: 'https://example.org/figur' })
    expect(COSTUMES['vom-server']).toMatchObject({ dataFormat: 'svg', data: svg })
  })
})

describe('loading', () => {
  it('stores inline svg as a costume, with the VM computing the centre', async () => {
    vi.mocked(cacheLibraryAsset).mockClear()
    await defineAsset('stern', { type: 'costume', svg })
    const entry = COSTUMES.stern
    expect(entry).toEqual({ key: 'stern', dataFormat: 'svg', data: svg, rotationCenterX: undefined, rotationCenterY: undefined })
    expect(cacheLibraryAsset).toHaveBeenCalledWith(entry)
    expect(assetError('stern')).toBeUndefined()
  })

  it('loads a data: URL as a backdrop, keeping the rotation centre', async () => {
    const url = 'data:image/svg+xml;base64,' + btoa(svg)
    await defineAsset('himmel', { type: 'backdrop', url, rotationCenterX: 240, rotationCenterY: 180 })
    expect(BACKDROPS.himmel).toMatchObject({ dataFormat: 'svg', data: svg, rotationCenterX: 240, rotationCenterY: 180 })
    expect(COSTUMES.himmel).toBeUndefined()
  })

  it('loads sounds and leaves rate and sample count to the VM', async () => {
    const wav = bytes('RIFF', 36, 0, 0, 0, 'WAVEfmt ')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(wav))
    await defineAsset('klang', { type: 'sound', url: 'https://example.org/klang' })
    expect(SOUNDS.klang).toEqual({ key: 'klang', dataFormat: 'wav', data: wav })
  })

  it('keeps errors instead of rejecting, and assetsReady still resolves', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const changed = vi.fn()
    const stop = onAssetsChanged(changed)
    const promise = defineAsset('fehlt', { type: 'costume', url: 'https://example.org/fehlt.png' })
    await assetsReady()
    await expect(promise).resolves.toBeUndefined()
    stop()
    expect(assetError('fehlt')).toBe('HTTP 404')
    expect(COSTUMES.fehlt).toBeUndefined()
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('rejects a sound that is an image', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await defineAsset('falsch', { type: 'sound', svg })
    expect(assetError('falsch')).toMatch(/wav or mp3/)
  })

  it('waits for assets defined while waiting', async () => {
    let release!: (r: Response) => void
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>((resolve) => (release = resolve)))
    defineAsset('spaet', { type: 'costume', url: 'https://example.org/spaet.svg' })
    const ready = assetsReady()
    setTimeout(() => release(new Response(svg)), 10)
    await ready
    expect(COSTUMES.spaet).toBeDefined()
  })
})

describe('sprites', () => {
  it('registers presets, named by default like their key', () => {
    defineSprite('kristall', { costumes: ['kristall'] })
    expect(SPRITES.kristall).toEqual({ name: 'kristall', costumes: ['kristall'], sounds: [] })
    defineSprite('kristall', { name: 'Kristall', costumes: ['kristall'], sounds: ['pop'] })
    expect(SPRITES.kristall).toEqual({ name: 'Kristall', costumes: ['kristall'], sounds: ['pop'] })
    expect(() => defineSprite('leer', { costumes: [] })).toThrow(/costume/)
  })
})

describe('resolveUrl', () => {
  it('keeps absolute and data: URLs', () => {
    expect(resolveUrl('https://example.org/a.png')).toBe('https://example.org/a.png')
    expect(resolveUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
  })

  it('resolves relative URLs against the course README', () => {
    vi.stubGlobal('location', { search: '?' + encodeURIComponent('https://example.org/kurs/README.md') })
    expect(resolveUrl('assets/a.png')).toBe('https://example.org/kurs/assets/a.png')
    vi.stubGlobal('location', { search: '?https://example.org/kurs/README.md' })
    expect(resolveUrl('../b.png')).toBe('https://example.org/b.png')
  })
})
