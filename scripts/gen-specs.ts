// Generates src/format/specs.json — the table the text format is built on.
//
// Run with: npm run gen:specs
//
// For every block it records, in message order (the order of %1, %2 … in the
// Scratch/scratchblocks texts), the named inputs and fields, together with the
// shadow blocks the toolbox uses for them. For every static dropdown it
// records the internal values with their German and English display texts.

import { JSDOM } from 'jsdom'
import { writeFileSync } from 'node:fs'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true })
const g = globalThis as any
for (const k of ['window', 'document', 'navigator', 'DOMParser', 'XMLSerializer', 'Element', 'Node', 'HTMLElement', 'SVGElement', 'getComputedStyle', 'requestAnimationFrame']) {
  if (!(k in g)) g[k] = (dom.window as any)[k]
}

const SB: any = await import('scratch-blocks')
const commands: any[] = (await import('scratchblocks/syntax/commands.js')).default
const { default: VMScratchBlocks } = await import('../src/vendor/scratch-gui/blocks.js')
const { default: makeToolboxXML } = await import('../src/vendor/scratch-gui/make-toolbox-xml.js')

// Minimal VM stand-in so the VM-dependent menus can be defined.
const stage = { isStage: true, getName: () => 'Stage', getCostumes: () => [], variables: {} }
const fakeVm: any = {
  editingTarget: null,
  runtime: {
    targets: [stage],
    flyoutBlocks: { _blocks: {} },
    getTargetForStage: () => stage,
    getSpriteTargetByName: () => null,
    getAllVarNamesOfType: () => [],
  },
}
VMScratchBlocks(fakeVm)

/** scratchblocks id → opcode, where lowercasing the id is not enough */
const ID_TO_OPCODE: Record<string, string> = {
  LOOKS_NEXTBACKDROP_BLOCK: 'looks_nextbackdrop',
  SOUND_SETEFFECTO: 'sound_seteffectto',
  CONTROL_WAITUNTIL: 'control_wait_until',
  CONTROL_REPEATUNTIL: 'control_repeat_until',
  CONTROL_STARTASCLONE: 'control_start_as_clone',
  CONTROL_CREATECLONEOF: 'control_create_clone_of',
  CONTROL_DELETETHISCLONE: 'control_delete_this_clone',
  OPERATORS_LETTEROF: 'operator_letter_of',
  'pen.clear': 'pen_clear',
  'pen.stamp': 'pen_stamp',
  'pen.penDown': 'pen_penDown',
  'pen.penUp': 'pen_penUp',
  'pen.setColor': 'pen_setPenColorToColor',
  'pen.changeColorParam': 'pen_changePenColorParamBy',
  'pen.setColorParam': 'pen_setPenColorParamTo',
  'pen.changeSize': 'pen_changePenSizeBy',
  'pen.setSize': 'pen_setPenSizeTo',
  'pen.changeHue': 'pen_changePenHueBy',
  'pen.setHue': 'pen_setPenHueToNumber',
  'pen.changeShade': 'pen_changePenShadeBy',
  'pen.setShade': 'pen_setPenShadeToNumber',
}

/** Pen blocks are defined by the VM extension, not by scratch-blocks. */
const PEN_ARGS: Record<string, any[]> = {
  pen_clear: [],
  pen_stamp: [],
  pen_penDown: [],
  pen_penUp: [],
  pen_setPenColorToColor: [{ name: 'COLOR', kind: 'input', shadow: 'colour_picker', shadowField: 'COLOUR', default: '#0000ff' }],
  pen_changePenColorParamBy: [
    { name: 'COLOR_PARAM', kind: 'input', shadow: 'pen_menu_colorParam', shadowField: 'colorParam', default: 'color' },
    { name: 'VALUE', kind: 'input', shadow: 'math_number', shadowField: 'NUM', default: '10' },
  ],
  pen_setPenColorParamTo: [
    { name: 'COLOR_PARAM', kind: 'input', shadow: 'pen_menu_colorParam', shadowField: 'colorParam', default: 'color' },
    { name: 'VALUE', kind: 'input', shadow: 'math_number', shadowField: 'NUM', default: '50' },
  ],
  pen_changePenSizeBy: [{ name: 'SIZE', kind: 'input', shadow: 'math_number', shadowField: 'NUM', default: '1' }],
  pen_setPenSizeTo: [{ name: 'SIZE', kind: 'input', shadow: 'math_number', shadowField: 'NUM', default: '1' }],
  pen_changePenHueBy: [{ name: 'HUE', kind: 'input', shadow: 'math_number', shadowField: 'NUM', default: '10' }],
  pen_setPenHueToNumber: [{ name: 'HUE', kind: 'input', shadow: 'math_number', shadowField: 'NUM', default: '0' }],
  pen_changePenShadeBy: [{ name: 'SHADE', kind: 'input', shadow: 'math_number', shadowField: 'NUM', default: '10' }],
  pen_setPenShadeToNumber: [{ name: 'SHADE', kind: 'input', shadow: 'math_number', shadowField: 'NUM', default: '50' }],
}

const PEN_MENUS = {
  'pen_menu_colorParam.colorParam': {
    options: ['color', 'saturation', 'brightness', 'transparency'],
    de: { color: 'Farbe', saturation: 'Sättigung', brightness: 'Helligkeit', transparency: 'Transparenz' },
    en: { color: 'color', saturation: 'saturation', brightness: 'brightness', transparency: 'transparency' },
  },
}

// --- shadows and defaults from the toolbox --------------------------------

const shadows: Record<string, Record<string, { shadow: string; shadowField: string | null; default: string }>> = {}

for (const isStage of [false, true]) {
  const xml = makeToolboxXML(false, isStage, 'target', [], 'costume', 'backdrop', 'sound')
  const doc = new dom.window.DOMParser().parseFromString(xml, 'text/xml')
  for (const block of Array.from(doc.querySelectorAll('category > block')) as Element[]) {
    const type = block.getAttribute('type')!
    for (const value of Array.from(block.children).filter((c) => c.tagName === 'value')) {
      const shadow = Array.from(value.children).find((c) => c.tagName === 'shadow')
      if (!shadow) continue
      const field = Array.from(shadow.children).find((c) => c.tagName === 'field')
      shadows[type] ??= {}
      shadows[type][value.getAttribute('name')!] ??= {
        shadow: shadow.getAttribute('type')!,
        shadowField: field?.getAttribute('name') ?? null,
        default: field?.textContent ?? '',
      }
    }
  }
}

/** Inputs of blocks that only exist in dynamic categories (variables, lists). */
const SHADOW_OVERRIDES: Record<string, Record<string, { shadow: string; shadowField: string; default: string }>> = {
  data_setvariableto: { VALUE: { shadow: 'text', shadowField: 'TEXT', default: '0' } },
  data_changevariableby: { VALUE: { shadow: 'math_number', shadowField: 'NUM', default: '1' } },
  data_addtolist: { ITEM: { shadow: 'text', shadowField: 'TEXT', default: 'thing' } },
  data_deleteoflist: { INDEX: { shadow: 'math_integer', shadowField: 'NUM', default: '1' } },
  data_insertatlist: {
    ITEM: { shadow: 'text', shadowField: 'TEXT', default: 'thing' },
    INDEX: { shadow: 'math_integer', shadowField: 'NUM', default: '1' },
  },
  data_replaceitemoflist: {
    INDEX: { shadow: 'math_integer', shadowField: 'NUM', default: '1' },
    ITEM: { shadow: 'text', shadowField: 'TEXT', default: 'thing' },
  },
  data_itemoflist: { INDEX: { shadow: 'math_integer', shadowField: 'NUM', default: '1' } },
  data_itemnumoflist: { ITEM: { shadow: 'text', shadowField: 'TEXT', default: 'thing' } },
  data_listcontainsitem: { ITEM: { shadow: 'text', shadowField: 'TEXT', default: 'thing' } },
}
for (const [opcode, inputs] of Object.entries(SHADOW_OVERRIDES)) {
  shadows[opcode] = { ...(shadows[opcode] ?? {}), ...inputs }
}

// --- block arguments in message order -------------------------------------

const ws = new SB.Workspace()

function describe(opcode: string) {
  const block = ws.newBlock(opcode)
  const args: any[] = []
  const statements: string[] = []
  for (const input of block.inputList) {
    for (const field of input.fieldRow) {
      if (!field.name) continue
      const entry: any = { name: field.name, kind: 'field' }
      if (field.constructor.name && typeof field.getOptions === 'function') entry.dropdown = true
      if (typeof field.getVariable === 'function') {
        entry.variable = field.defaultType ?? field.variableTypes?.[0] ?? ''
      }
      args.push(entry)
    }
    if (input.type === SB.inputs?.inputTypes?.VALUE || input.type === 1) {
      const entry: any = { name: input.name, kind: 'input', ...(shadows[opcode]?.[input.name] ?? {}) }
      // menu shadows (e.g. motion_goto_menu) have no <field> in the toolbox
      if (entry.shadow && !entry.shadowField && SB.Blocks[entry.shadow]) {
        const shadow = ws.newBlock(entry.shadow)
        const field = shadow.inputList.flatMap((i: any) => i.fieldRow).find((f: any) => f.name)
        entry.shadowField = field?.name ?? null
        shadow.dispose()
      }
      args.push(entry)
    } else if (input.type === SB.inputs?.inputTypes?.STATEMENT || input.type === 3) {
      statements.push(input.name)
    }
  }
  block.dispose()
  return { args, statements }
}

function dropdownOptions(opcode: string, fieldName: string, locale: string): [string, string][] | null {
  SB.ScratchMsgs.setLocale(locale)
  const block = ws.newBlock(opcode)
  try {
    const field = block.getField(fieldName)
    if (!field || typeof field.getOptions !== 'function' || typeof field.getVariable === 'function') return null
    return field.getOptions(false).filter((o: any) => typeof o[0] === 'string')
  } catch {
    return null
  } finally {
    block.dispose()
  }
}

const blocks: Record<string, any> = {}
const menus: Record<string, any> = { ...PEN_MENUS }

function recordMenu(opcode: string, fieldName: string) {
  const en = dropdownOptions(opcode, fieldName, 'en')
  const de = dropdownOptions(opcode, fieldName, 'de')
  if (!en?.length) return
  const entry: any = { options: en.map((o) => o[1]), en: {}, de: {} }
  for (const [text, value] of en) entry.en[value] = text
  for (const [text, value] of de ?? []) entry.de[value] = text
  menus[`${opcode}.${fieldName}`] = entry
}

for (const command of commands) {
  if (!command.id || command.id.startsWith('scratchblocks:')) continue
  const opcode = ID_TO_OPCODE[command.id] ?? command.id.toLowerCase().replace(/^operators_/, 'operator_')

  if (PEN_ARGS[opcode]) {
    blocks[opcode] = { sb: command.id, shape: command.shape, args: PEN_ARGS[opcode], statements: [] }
    continue
  }
  if (!SB.Blocks[opcode]) continue
  if (blocks[opcode]) continue

  SB.ScratchMsgs.setLocale('en')
  const { args, statements } = describe(opcode)
  blocks[opcode] = { sb: command.id, shape: command.shape, args, statements }

  for (const arg of args) {
    if (arg.kind === 'field' && arg.dropdown) recordMenu(opcode, arg.name)
    if (arg.kind === 'input' && arg.shadow && arg.shadowField && SB.Blocks[arg.shadow]) {
      recordMenu(arg.shadow, arg.shadowField)
    }
  }
}

// scratchblocks has no own id for if/else, it is CONTROL_IF with two branches
SB.ScratchMsgs.setLocale('en')
blocks.control_if_else = { sb: 'CONTROL_IF', shape: 'c-block', ...describe('control_if_else') }

const out = new URL('../src/format/specs.json', import.meta.url)
writeFileSync(out, JSON.stringify({ blocks, menus }, null, 1) + '\n')
console.log(`${Object.keys(blocks).length} blocks, ${Object.keys(menus).length} menus → ${out.pathname}`)
