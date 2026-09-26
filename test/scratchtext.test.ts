import { describe, expect, it, vi } from 'vitest'

// The library assets are bundle-text imports; the md5 ids are irrelevant here.
vi.mock('../src/engine', () => {
  const byKey = new Map<string, string>()
  const byMd5 = new Map<string, string>()
  for (const key of ['robo-a', 'robo-b', 'weiss', 'plopp', 'piep']) {
    byKey.set(key, 'md5-' + key)
    byMd5.set('md5-' + key, key)
  }
  return {
    libraryIds: { byKey, byMd5 },
    storeEmbeddedAsset: () => 'md5-embedded',
    getAssetData: () => null,
  }
})
vi.mock('../src/assets/library', async () => {
  const svg = (key: string) => ({ key, dataFormat: 'svg', data: '<svg/>', rotationCenterX: 40, rotationCenterY: 50 })
  const wav = (key: string) => ({ key, dataFormat: 'wav', data: new Uint8Array(), rate: 22050, sampleCount: 1 })
  return {
    COSTUMES: { 'robo-a': svg('robo-a'), 'robo-b': svg('robo-b') },
    BACKDROPS: { weiss: { ...svg('weiss'), rotationCenterX: 240, rotationCenterY: 180 } },
    SOUNDS: { plopp: wav('plopp'), piep: wav('piep') },
    SPRITES: { robo: { name: { de: 'Robo', en: 'Robo' }, costumes: ['robo-a', 'robo-b'], sounds: ['plopp'] } },
    DEFAULT_SPRITE: 'robo',
    DEFAULT_BACKDROP: 'weiss',
  }
})

const { parseScratchText, stringifyScratchText } = await import('../src/format/scratchtext')
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
        'Position: -100, 0',
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
      costumes: [{ name: 'weiss', assetId: 'md5-weiss' }], sounds: [], volume: 100, layerOrder: 0,
    }
    const robo = {
      isStage: false, name: 'Robo', variables: {}, lists: {}, broadcasts: {}, blocks, comments: {}, currentCostume: 0,
      costumes: [{ name: 'robo-a', assetId: 'md5-robo-a' }, { name: 'robo-b', assetId: 'md5-robo-b' }],
      sounds: [{ name: 'plopp', assetId: 'md5-plopp' }], volume: 100, layerOrder: 1, visible: true, x: 0, y: 0,
      size: 100, direction: 90, draggable: false, rotationStyle: 'all around',
    }
    return { targets: [stage, robo], monitors: [], extensions: opcode.startsWith('pen_') ? ['pen'] : [] }
  }

  const skip = new Set(['control_else'])
  for (const opcode of Object.keys(specs.blocks)) {
    if (skip.has(opcode)) continue
    for (const options of [de, en]) {
      it(`${opcode} (${options.lang})`, () => {
        const text = stringifyScratchText(build(opcode) as any, options)
        const again = stringifyScratchText(parseScratchText(text, options), options)
        expect(again).toBe(text)
      })
    }
  }
})

describe('README examples', async () => {
  const { readFileSync } = await import('node:fs')
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  const examples = [...readme.matchAll(/``` scratch\n([\s\S]*?)```/g)].map((m) => m[1])

  examples.forEach((text, i) => {
    it(`example ${i + 1} parses and is stable`, () => {
      const once = stringifyScratchText(parseScratchText(text, de), de)
      expect(stringifyScratchText(parseScratchText(once, de), de)).toBe(once)
    })
  })
})
