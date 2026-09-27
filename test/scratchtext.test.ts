import { describe, expect, it, vi } from 'vitest'

// The library assets are bundle-text imports; the md5 ids are irrelevant here.
vi.mock('../src/engine', () => {
  const byKey = new Map<string, string>()
  const byMd5 = new Map<string, string>()
  for (const key of ['robo-a', 'robo-b', 'white', 'pop', 'beep']) {
    byKey.set(key, 'md5-' + key)
    byMd5.set('md5-' + key, key)
  }
  return {
    libraryIds: { byKey, byMd5 },
    storeEmbeddedAsset: () => 'md5-embedded',
    getAssetData: () => null,
    // assets registered by a course (registry.ts)
    cacheLibraryAsset: vi.fn((entry: { key: string }) => {
      byKey.set(entry.key, 'md5-' + entry.key)
      byMd5.set('md5-' + entry.key, entry.key)
      return 'md5-' + entry.key
    }),
  }
})
vi.mock('../src/assets/library', async () => {
  const svg = (key: string) => ({ key, dataFormat: 'svg', data: '<svg/>', rotationCenterX: 40, rotationCenterY: 50 })
  const wav = (key: string) => ({ key, dataFormat: 'wav', data: new Uint8Array(), rate: 22050, sampleCount: 1 })
  return {
    COSTUMES: { 'robo-a': svg('robo-a'), 'robo-b': svg('robo-b') },
    BACKDROPS: { white: { ...svg('white'), rotationCenterX: 240, rotationCenterY: 180 } },
    SOUNDS: { pop: wav('pop'), beep: wav('beep') },
    SPRITES: { robo: { name: 'Robo', costumes: ['robo-a', 'robo-b'], sounds: ['pop'] } },
    DEFAULT_SPRITE: 'robo',
    DEFAULT_BACKDROP: 'white',
  }
})

const { parseScratchText, stringifyScratchText } = await import('../src/format/scratchtext')
const { defineAsset, defineSprite } = await import('../src/assets/registry')
type TextOptions = import('../src/format/scratchtext').TextOptions

const de: TextOptions = { lang: 'de' }
const en: TextOptions = { lang: 'en' }

function sprite(project: any, name = 'Robo') {
  return project.targets.find((t: any) => !t.isStage && t.name === name)
}

function topLevel(target: any) {
  return Object.entries<any>(target.blocks).filter(([, b]) => b.topLevel)
}

function roundTrip(text: string, options = de) {
  return stringifyScratchText(parseScratchText(text, options), options)
}

describe('parse', () => {
  it('creates stage and Robo for an empty text', () => {
    const project = parseScratchText('', de)
    expect(project.targets).toHaveLength(2)
    expect(project.targets[0].isStage).toBe(true)
    expect(sprite(project).costumes.map((c: any) => c.name)).toEqual(['robo-a', 'robo-b'])
    expect(project.meta.semver).toBe('3.0.0')
  })

  it('builds a stack with a c-block', () => {
    const project = parseScratchText(
      [
        'Wenn die grüne Flagge angeklickt',
        'wiederhole (4) mal',
        '  gehe (80) er Schritt',
        '  drehe dich nach rechts um (90) Grad',
        'Ende',
      ].join('\n'),
      de
    )
    const blocks = sprite(project).blocks
    const [[hatId, hat]] = topLevel(sprite(project))
    expect(hat.opcode).toBe('event_whenflagclicked')
    const repeat = blocks[hat.next]
    expect(repeat.opcode).toBe('control_repeat')
    expect(repeat.parent).toBe(hatId)
    expect(repeat.inputs.TIMES).toEqual([1, [6, '4']])
    const move = blocks[repeat.inputs.SUBSTACK[1]]
    expect(move.opcode).toBe('motion_movesteps')
    expect(move.inputs.STEPS).toEqual([1, [4, '80']])
    expect(blocks[move.next].opcode).toBe('motion_turnright')
  })

  it('maps localized menu values to internal values', () => {
    const project = parseScratchText(
      ['Wenn Taste [Pfeil nach rechts v] gedrückt wird', 'gehe zu (Zufallsposition v)'].join('\n'),
      de
    )
    const blocks = sprite(project).blocks
    const [[, hat]] = topLevel(sprite(project))
    expect(hat.fields.KEY_OPTION).toEqual(['right arrow', null])
    const goto = blocks[hat.next]
    const menu = blocks[goto.inputs.TO[1]]
    expect(menu.opcode).toBe('motion_goto_menu')
    expect(menu.shadow).toBe(true)
    expect(menu.fields.TO).toEqual(['_random_', null])
  })

  it('creates variables and uses them', () => {
    const project = parseScratchText(
      ['[Figur Robo]', 'Variablen: Ecken = 6', '', 'Wenn die grüne Flagge angeklickt', 'gehe (Ecken) er Schritt'].join(
        '\n'
      ),
      de
    )
    const robo = sprite(project)
    const [[id, variable]] = Object.entries<any>(robo.variables)
    expect(variable).toEqual(['Ecken', 6])
    const [[, hat]] = topLevel(robo)
    expect(robo.blocks[hat.next].inputs.STEPS).toEqual([3, [12, 'Ecken', id], [4, '10']])
  })

  it('marks the current costume with a star', () => {
    const project = parseScratchText(['[Sprite Robo]', 'costumes: robo-a, robo-b*'].join('\n'), en)
    expect(sprite(project).currentCostume).toBe(1)
    expect(stringifyScratchText(project, en)).toBe(['[Sprite Robo]', 'costumes: robo-a, robo-b*'].join('\n'))
  })

  it('reads sections in other languages', () => {
    const et = { lang: 'et' }
    const text = stringifyScratchText(
      parseScratchText(['[Sprite Robo]', 'x: 50', 'variables: punktid = 3', '', 'when green flag clicked', 'move (10) steps'].join('\n'), et),
      et
    )
    expect(text).toContain('punktid = 3')
    expect(text).toContain('x: 50')
    expect(stringifyScratchText(parseScratchText(text, et), et)).toBe(text)
  })

  it('reads the display language of a translated page, but writes the course language', () => {
    const en = ['[Sprite Robo]', 'variables: n = 1', '', 'when green flag clicked', 'repeat (4)', '  move (10) steps', 'end'].join('\n')
    const project = parseScratchText(en, { lang: 'en' })
    const french = stringifyScratchText(project, { lang: 'fr' })
    const german = stringifyScratchText(project, { lang: 'de' })
    // a German course, shown in French: French text is understood …
    const read = parseScratchText(french, { lang: 'de', display: 'fr' })
    // … and written back in German
    expect(stringifyScratchText(read, { lang: 'de', display: 'fr' })).toBe(german)
  })

  it('reads sprite properties', () => {
    const project = parseScratchText(
      ['[Figur Käfer]', 'Kostüme: robo-b', 'Position: -100, 50', 'Richtung: 180', 'Größe: 50', 'Sichtbar: nein'].join('\n'),
      de
    )
    const kaefer = sprite(project, 'Käfer')
    expect(kaefer).toMatchObject({ x: -100, y: 50, direction: 180, size: 50, visible: false })
    expect(kaefer.costumes.map((c: any) => c.name)).toEqual(['robo-b'])
    expect(sprite(project)).toBeUndefined()
  })

  it('reports the line of an unknown block', () => {
    expect(() => parseScratchText('Wenn die grüne Flagge angeklickt\nfliege zum Mond', de)).toThrow(/2/)
  })
})

describe('own assets', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20"/></svg>'

  it('accepts registered keys and round trips them', async () => {
    await defineAsset('dschungel', { type: 'backdrop', svg })
    const text = ['[Bühne]', 'Hintergründe: dschungel, white*'].join('\n')
    const project = parseScratchText(text, de)
    expect(project.targets[0].costumes.map((c: any) => c.name)).toEqual(['dschungel', 'white'])
    expect(project.targets[0].currentCostume).toBe(1)
    expect(stringifyScratchText(project, de)).toBe(text)
  })

  it('reports unknown keys with their line and the known ones', () => {
    expect(() => parseScratchText(['[Figur Robo]', 'x: 10', 'Kostüme: robo-a, gibtsnicht'].join('\n'), de)).toThrow(
      'Zeile 3: das Kostüm „gibtsnicht“ gibt es nicht (bekannt: robo-a, robo-b'
    )
    expect(() => parseScratchText(['[Sprite Robo]', 'sounds: boing'].join('\n'), en)).toThrow(
      'Line 2: there is no sound “boing” (known: pop, beep'
    )
  })

  it('reports assets that could not be loaded', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await defineAsset('kaputt', { type: 'costume', url: 'https://example.org/kaputt.png' })
    fetch.mockRestore()
    error.mockRestore()
    expect(() => parseScratchText(['[Sprite Robo]', 'costumes: kaputt'].join('\n'), en)).toThrow(
      'Line 2: “kaputt” could not be loaded: HTTP 404'
    )
  })

  it('gives new sprites the costumes of their preset', async () => {
    await defineAsset('kristall', { type: 'costume', svg, rotationCenterX: 20, rotationCenterY: 20 })
    defineSprite('kristall', { name: 'Kristall', costumes: ['kristall'] })
    const text = ['[Sprite Kristall]', 'x: 100'].join('\n')
    const project = parseScratchText(text, en)
    const kristall = sprite(project, 'Kristall')
    expect(kristall.costumes.map((c: any) => c.name)).toEqual(['kristall'])
    expect(kristall.costumes[0]).toMatchObject({ rotationCenterX: 20, rotationCenterY: 20, dataFormat: 'svg' })
    expect(kristall.sounds).toEqual([])
    expect(stringifyScratchText(project, en)).toBe(text)
    // by key as well
    expect(sprite(parseScratchText('[Sprite kristall]', en), 'kristall').costumes[0].name).toBe('kristall')
  })
})

describe('round trip', () => {
  const cases: [string, string, typeof de][] = [
    [
      'simple script',
      ['Wenn die grüne Flagge angeklickt', 'wiederhole (4) mal', '  gehe (80) er Schritt', '  drehe dich nach rechts um (90) Grad', 'Ende'].join('\n'),
      de,
    ],
    [
      'english',
      ['when green flag clicked', 'repeat (10)', '  move (10) steps', '  turn left (15) degrees', 'end'].join('\n'),
      en,
    ],
    [
      'if else and operators',
      [
        'Wenn die grüne Flagge angeklickt',
        'falls <((1) + (2)) > (2)>, dann',
        '  sage [ja]',
        'sonst',
        '  sage [nein] für (2) Sekunden',
        'Ende',
      ].join('\n'),
      de,
    ],
    [
      'two scripts with menus and messages',
      [
        'Wenn Taste [Leertaste v] gedrückt wird',
        'sende [Start v] an alle',
        '',
        'Wenn ich [Start v] empfange',
        'gehe zu (Mauszeiger v)',
        'setze Effekt [Farbe v] auf (25)',
      ].join('\n'),
      de,
    ],
    [
      'sections, variables and lists',
      [
        '[Bühne]',
        'Variablen: Punkte = 0',
        '',
        'Wenn die grüne Flagge angeklickt',
        'setze [Punkte v] auf (0)',
        '',
        '[Figur Robo]',
        'x: -100',
        'Listen: Wörter = Hallo, Welt',
        '',
        'Wenn diese Figur angeklickt wird',
        'ändere [Punkte v] um (1)',
        'füge [Scratch] zu [Wörter v] hinzu',
        'sage (Element (1) von [Wörter v])',
      ].join('\n'),
      de,
    ],
    [
      'monitors of variables and lists',
      [
        '[Stage]',
        'variables: points = 0',
        'lists: names = Ada, Linus',
        'monitors: points, names',
        '',
        '[Sprite Robo]',
        'variables: steps = 3',
        'lists: path =',
        'monitors: path',
        '',
        'when green flag clicked',
        'add [left] to [path v]',
      ].join('\n'),
      en,
    ],
    [
      'custom blocks',
      [
        'Definiere springe (hoch) mal <schnell>',
        'ändere y um (hoch)',
        '',
        'Wenn die grüne Flagge angeklickt',
        'springe (10) mal <>',
      ].join('\n'),
      de,
    ],
    [
      'pen',
      [
        'Wenn die grüne Flagge angeklickt',
        'lösche alles',
        'schalte Stift ein',
        'setze Stiftdicke auf (3)',
        'schalte Stift aus',
      ].join('\n'),
      de,
    ],
  ]

  for (const [name, text, options] of cases) {
    it(name, () => {
      expect(roundTrip(text, options)).toBe(text)
    })
  }
})

describe('monitors', () => {
  it('shows a list monitor of a list', () => {
    const project = parseScratchText(['[Stage]', 'lists: names =', 'monitors: names'].join('\n'), en)
    expect(project.monitors).toEqual([
      expect.objectContaining({ mode: 'list', opcode: 'data_listcontents', params: { LIST: 'names' }, visible: true }),
    ])
  })

  it('cannot name a list monitor that has the name of a variable', () => {
    const project = parseScratchText(['[Stage]', 'variables: x = 0', 'lists: x =', 'monitors: x'].join('\n'), en)
    project.monitors![0] = { ...project.monitors![0], mode: 'list', opcode: 'data_listcontents', params: { LIST: 'x' } }
    expect(() => stringifyScratchText(project, en)).toThrow(/same name/)
  })
})

describe('every block', async () => {
  const specs = (await import('../src/format/specs.json')).default as any
  const PRIMITIVE: Record<string, number> = {
    math_number: 4, math_positive_number: 5, math_whole_number: 6, math_integer: 7, math_angle: 8, colour_picker: 9, text: 10,
  }

  function build(opcode: string) {
    const spec = specs.blocks[opcode]
    const blocks: Record<string, any> = {}
    let n = 0
    const add = (op: string, extra: any = {}) => {
      const id = 'x' + ++n
      blocks[id] = { opcode: op, next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: false, ...extra }
      return id
    }
    const id = add(opcode)
    for (const arg of spec.args) {
      if (arg.kind === 'field') {
        const menu = specs.menus[`${opcode}.${arg.name}`]
        const value = arg.variable === 'list' ? 'Liste' : arg.variable === 'broadcast_msg' ? 'Nachricht' : arg.variable === '' ? 'Wert' : menu?.options[0] ?? 'x'
        blocks[id].fields[arg.name] = [value, arg.variable !== undefined ? 'v-' + value : null]
      } else if (arg.shadow && PRIMITIVE[arg.shadow]) {
        blocks[id].inputs[arg.name] = [1, [PRIMITIVE[arg.shadow], arg.shadow === 'colour_picker' ? '#ff0000' : arg.shadow === 'text' ? 'Hallo' : '7']]
      } else if (arg.shadow === 'event_broadcast_menu') {
        blocks[id].inputs[arg.name] = [1, [11, 'Nachricht', 'v-Nachricht']]
      } else if (arg.shadow) {
        const menu = specs.menus[`${arg.shadow}.${arg.shadowField}`]
        const sid = add(arg.shadow, { shadow: true, parent: id })
        blocks[sid].fields[arg.shadowField] = [menu?.options[0] ?? 'robo-a', null]
        blocks[id].inputs[arg.name] = [1, sid]
      }
    }
    // put reporters into a "say" block, booleans into "if", stacks under a hat
    let top = id
    if (spec.shape === 'reporter' || spec.shape === 'boolean') {
      const holder = spec.shape === 'reporter' ? add('looks_say') : add('control_if')
      blocks[holder].inputs[spec.shape === 'reporter' ? 'MESSAGE' : 'CONDITION'] =
        spec.shape === 'reporter' ? [3, id, [10, 'x']] : [2, id]
      blocks[id].parent = holder
      top = holder
    }
    if (!spec.shape.includes('hat')) {
      const hat = add('event_whenflagclicked', { topLevel: true, x: 0, y: 0 })
      blocks[hat].next = top
      blocks[top].parent = hat
    } else {
      Object.assign(blocks[top], { topLevel: true, x: 0, y: 0 })
    }
    const stage = {
      isStage: true, name: 'Stage', variables: { 'v-Wert': ['Wert', 0] }, lists: { 'v-Liste': ['Liste', []] },
      broadcasts: { 'v-Nachricht': 'Nachricht' }, blocks: {}, comments: {}, currentCostume: 0,
      costumes: [{ name: 'white', assetId: 'md5-white' }], sounds: [], volume: 100, layerOrder: 0,
    }
    const robo = {
      isStage: false, name: 'Robo', variables: {}, lists: {}, broadcasts: {}, blocks, comments: {}, currentCostume: 0,
      costumes: [{ name: 'robo-a', assetId: 'md5-robo-a' }, { name: 'robo-b', assetId: 'md5-robo-b' }],
      sounds: [{ name: 'pop', assetId: 'md5-pop' }], volume: 100, layerOrder: 1, visible: true, x: 0, y: 0,
      size: 100, direction: 90, draggable: false, rotationStyle: 'all around',
    }
    return { targets: [stage, robo], monitors: [], extensions: opcode.startsWith('pen_') ? ['pen'] : [] }
  }

  const { LANGUAGES } = await import('../src/i18n')
  for (const lang of LANGUAGES) {
    it(`all blocks survive the text format (${lang})`, () => {
      const failures: string[] = []
      for (const opcode of Object.keys(specs.blocks)) {
        const options = { lang }
        let text = ''
        try {
          text = stringifyScratchText(build(opcode) as any, options)
          const again = stringifyScratchText(parseScratchText(text, options), options)
          if (again !== text) failures.push(`${opcode}:\n${text}\n→\n${again}`)
        } catch (e: any) {
          failures.push(`${opcode}: ${e.message}\n${text}`)
        }
      }
      expect(failures).toEqual([])
    })
  }
})

describe('README examples', async () => {
  const { readFileSync } = await import('node:fs')
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  const examples = [...readme.matchAll(/``` scratch\n([\s\S]*?)```/g)].map((m) => m[1])

  // the assets the README defines in its examples
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"/>'
  await defineAsset('jungle', { type: 'backdrop', svg })
  await defineAsset('crystal', { type: 'costume', svg })
  await defineAsset('chime', { type: 'sound', url: 'data:audio/wav;base64,UklGRiQAAABXQVZF' })
  await defineAsset('star', { type: 'costume', svg })
  defineSprite('crystal', { name: 'Crystal', costumes: ['crystal'], sounds: ['chime'] })

  examples.forEach((text, i) => {
    it(`example ${i + 1} parses and is stable`, () => {
      const once = stringifyScratchText(parseScratchText(text, en), en)
      expect(stringifyScratchText(parseScratchText(once, en), en)).toBe(once)
    })
  })
})

describe('languages', async () => {
  const { resolveLang } = await import('../src/i18n')
  it('maps language tags to Scratch languages, English by default', () => {
    expect(resolveLang('de-AT')).toBe('de')
    expect(resolveLang('pt-BR')).toBe('pt-br')
    expect(resolveLang('zh')).toBe('zh-cn')
    expect(resolveLang('zh-TW')).toBe('zh-tw')
    expect(resolveLang('et')).toBe('et')
    expect(resolveLang('xx')).toBe('en')
    expect(resolveLang('')).toBe('en')
  })
})
