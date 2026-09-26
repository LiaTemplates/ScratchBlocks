// Generates the tables the template is built on. Run with: npm run gen
//
// src/format/specs.json — for every block, in message order (the order of
//   %1, %2 … in the Scratch/scratchblocks texts), the named inputs and fields
//   with the shadow blocks the toolbox uses for them; for every static
//   dropdown the internal values with their display texts in all languages.
//
// src/locales.json — per language the UI texts, pen extension texts and the
//   keywords of the text format, taken from Scratch's own translations
//   (scratch-l10n), so they read exactly like the Scratch editor.

import { JSDOM } from 'jsdom'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true })
const g = globalThis as any
for (const k of ['window', 'document', 'navigator', 'DOMParser', 'XMLSerializer', 'Element', 'Node', 'HTMLElement', 'SVGElement', 'getComputedStyle', 'requestAnimationFrame']) {
  if (!(k in g)) g[k] = (dom.window as any)[k]
}

const SB: any = await import('scratch-blocks')

const L10N = new URL('../node_modules/scratch-l10n/editor/', import.meta.url)
const LANGUAGES = readdirSync(new URL('interface/', L10N))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .filter((code) => code in SB.ScratchMsgs.locales || code === 'en')
const l10n = (part: string, code: string): Record<string, string> =>
  JSON.parse(readFileSync(new URL(`${part}/${code}.json`, L10N), 'utf8'))
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

const PEN_COLOR_PARAMS = ['color', 'saturation', 'brightness', 'transparency']

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
const menus: Record<string, any> = {}

/**
 * menus[key] = { options: [values], text: { en: {value: text}, <lang>: {…} } }
 * — other languages only list the texts that differ from English.
 */
function addMenu(key: string, options: string[], texts: Record<string, Record<string, string>>) {
  const entry: any = { options, text: { en: texts.en } }
  for (const [code, t] of Object.entries(texts)) {
    if (code === 'en') continue
    const diff = Object.fromEntries(Object.entries(t).filter(([v, text]) => text && text !== texts.en[v]))
    if (Object.keys(diff).length) entry.text[code] = diff
  }
  menus[key] = entry
}

function recordMenu(opcode: string, fieldName: string) {
  const en = dropdownOptions(opcode, fieldName, 'en')
  if (!en?.length) return
  const texts: Record<string, Record<string, string>> = {}
  for (const code of LANGUAGES) {
    texts[code] = {}
    for (const [text, value] of dropdownOptions(opcode, fieldName, code) ?? []) texts[code][value] = text
  }
  addMenu(`${opcode}.${fieldName}`, en.map((o) => o[1]), texts)
}

{
  const texts: Record<string, Record<string, string>> = {}
  for (const code of LANGUAGES) {
    const ext = l10n('extensions', code)
    texts[code] = Object.fromEntries(PEN_COLOR_PARAMS.map((p) => [p, ext[`pen.colorMenu.${p}`] ?? p]))
  }
  addMenu('pen_menu_colorParam.colorParam', PEN_COLOR_PARAMS, texts)
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

// --- UI texts, pen texts and text-format keywords per language -------------

/** key in locales.json → key in scratch-l10n (interface or blocks) */
const UI_KEYS: Record<string, string> = {
  ok: 'gui.prompt.ok',
  cancel: 'gui.prompt.cancel',
  makeBlock: 'gui.customProcedures.myblockModalTitle',
  addLabel: 'gui.customProcedures.addALabel',
  runWithoutRefresh: 'gui.customProcedures.runWithoutScreenRefresh',
  stage: 'gui.stageSelector.stage',
  addSprite: 'gui.spriteSelector.addSpriteFromLibrary',
  deleteSprite: 'gui.spriteSelectorItem.contextMenuDelete',
  fullscreen: 'gui.stageHeader.stageSizeFull',
  saveSb3: 'gui.menuBar.downloadToComputer',
}

const WORD_KEYS: Record<string, [string, string]> = {
  stage: ['interface', 'gui.stageSelector.stage'],
  sprite: ['interface', 'gui.SpriteInfo.sprite'],
  costumes: ['interface', 'gui.gui.costumesTab'],
  backdrops: ['interface', 'gui.gui.backdropsTab'],
  sounds: ['interface', 'gui.gui.soundsTab'],
  direction: ['interface', 'gui.SpriteInfo.direction'],
  size: ['interface', 'gui.SpriteInfo.size'],
  visible: ['interface', 'gui.SpriteInfo.show'],
  draggable: ['blocks', 'SENSING_SETDRAGMODE_DRAGGABLE'],
  variables: ['blocks', 'CATEGORY_VARIABLES'],
}

/** keywords must work as "Key: value" and inside "[Key Name]" */
const usableWord = (w?: string) => (w && !/[:\[\]]/.test(w) ? w.trim() : undefined)

const locales: Record<string, any> = {}
for (const code of LANGUAGES) {
  const ui = l10n('interface', code)
  const blockMsgs = l10n('blocks', code)
  const ext = l10n('extensions', code)
  const entry: any = { ui: {}, pen: {}, words: {} }

  for (const [key, id] of Object.entries(UI_KEYS)) if (ui[id]) entry.ui[key] = ui[id]
  if (ui['gui.customProcedures.addAnInputNumberText']) {
    entry.ui.addInput = `${ui['gui.customProcedures.addAnInputNumberText']} (${ui['gui.customProcedures.numberTextType']})`
    entry.ui.addBoolean = `${ui['gui.customProcedures.addAnInputBoolean']} (${ui['gui.customProcedures.booleanType']})`
  }
  for (const [key, text] of Object.entries(ext)) if (key.startsWith('pen.')) entry.pen[key] = text
  for (const [key, [part, id]] of Object.entries(WORD_KEYS)) {
    const word = usableWord((part === 'interface' ? ui : blockMsgs)[id])
    if (word) entry.words[key] = word
  }
  locales[code] = entry
}

const localesOut = new URL('../src/locales.json', import.meta.url)
writeFileSync(localesOut, JSON.stringify(locales) + '\n')
console.log(`${Object.keys(locales).length} languages → ${localesOut.pathname}`)
