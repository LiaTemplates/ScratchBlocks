// Everything language-dependent in the text format.
//
// Block texts come from the scratchblocks locales (all languages Scratch
// supports), keywords for sections and properties from Scratch's own
// translations (src/locales.json). English is always understood as well, so a
// text can mix the course language with English.

import { loadLanguages, parse } from 'scratchblocks/syntax/index.js'
import allLocales from 'scratchblocks/locales/all.js'
import commands from 'scratchblocks/syntax/commands.js'
import specs from './specs.json'
import { LOCALES, t, type Key, type Lang } from '../i18n'

const SB_LOCALES: Record<string, any> = {}
for (const [key, locale] of Object.entries<any>(allLocales)) SB_LOCALES[key.replace(/_/g, '-')] = locale
loadLanguages(SB_LOCALES)

const ENGLISH_SPECS: Record<string, string> = {}
for (const command of commands as any[]) if (command.id) ENGLISH_SPECS[command.id] = command.spec

const MENUS = specs.menus as Record<string, { options: string[]; text: Record<string, Record<string, string>> }>

const UNICODE_ICONS: Record<string, string> = { '@greenFlag': '⚑', '@turnRight': '↻', '@turnLeft': '↺' }

/** Readable spellings instead of icons — aliases that scratchblocks parses. */
const SPEC_OVERRIDES: Record<string, Record<string, string>> = {
  en: {
    EVENT_WHENFLAGCLICKED: 'when green flag clicked',
    MOTION_TURNRIGHT: 'turn right %1 degrees',
    MOTION_TURNLEFT: 'turn left %1 degrees',
  },
  de: {
    EVENT_WHENFLAGCLICKED: 'Wenn die grüne Flagge angeklickt',
    MOTION_TURNRIGHT: 'drehe dich nach rechts um %1 Grad',
    MOTION_TURNLEFT: 'drehe dich nach links um %1 Grad',
  },
}

/** Property ids of the text format. */
export type Property =
  | 'costumes'
  | 'backdrops'
  | 'sounds'
  | 'x'
  | 'y'
  | 'position'
  | 'direction'
  | 'size'
  | 'visible'
  | 'draggable'
  | 'rotation'
  | 'variables'
  | 'lists'
  | 'monitors'

/** Hand-written keywords; Scratch's translations fill in the other languages. */
const OWN_WORDS: Record<string, Partial<Record<Property | 'stage' | 'sprite', string>>> = {
  en: {
    stage: 'Stage',
    sprite: 'Sprite',
    costumes: 'costumes',
    backdrops: 'backdrops',
    sounds: 'sounds',
    direction: 'direction',
    size: 'size',
    visible: 'visible',
    draggable: 'draggable',
    rotation: 'rotation style',
    variables: 'variables',
    lists: 'lists',
    monitors: 'monitors',
    position: 'position',
  },
  de: {
    stage: 'Bühne',
    sprite: 'Figur',
    costumes: 'Kostüme',
    backdrops: 'Hintergründe',
    sounds: 'Klänge',
    direction: 'Richtung',
    size: 'Größe',
    visible: 'Sichtbar',
    draggable: 'Ziehbar',
    rotation: 'Drehtyp',
    variables: 'Variablen',
    lists: 'Listen',
    monitors: 'Anzeigen',
    position: 'Position',
  },
}

/** Also understood when reading, e.g. without umlauts. */
const EXTRA_KEYS: Record<string, Property> = {
  kostueme: 'costumes',
  hintergruende: 'backdrops',
  klaenge: 'sounds',
  groesse: 'size',
  show: 'visible',
}

export interface TextLanguage {
  code: Lang
  /** languages handed to the scratchblocks parser */
  parseLanguages: string[]
  word(id: 'stage' | 'sprite' | Property): string
  words: { end: string; else: string; define: string; defineSuffix: string; yes: string; no: string }
  property(key: string): Property | undefined
  isStageWord(word: string): boolean
  isSpriteWord(word: string): boolean
  isYes(value: string): boolean
  specText(sbId: string): string
  englishSpecText(sbId: string): string
  /** does `line` parse back to the block `sbId` in this language? */
  readsAs(line: string, sbId: string): boolean
  menuText(key: string, value: string): string
  englishMenuText(key: string, value: string): string
  menuValue(key: string, display: string): string
  message(key: Key, ...args: string[]): string
}

const cache = new Map<string, TextLanguage>()

/**
 * `code` is the language the text is written in (the course language).
 * `display` is the language of the interface, e.g. after a page translation:
 * it is understood when reading, and messages are shown in it.
 */
export function textLanguage(code: Lang, display: Lang = code): TextLanguage {
  const cacheKey = `${code}|${display}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!
  const sbLocale = SB_LOCALES[code]
  const l10nWords = LOCALES[code]?.words ?? {}
  const parseLanguages = [...new Set(['en', code, display])].filter((l) => l === 'en' || SB_LOCALES[l])

  const word = (id: 'stage' | 'sprite' | Property): string =>
    OWN_WORDS[code]?.[id] ?? (l10nWords as any)[id] ?? OWN_WORDS.en[id] ?? id

  // reading: own words and Scratch's words of this language, then English
  const keys = new Map<string, Property>()
  const addKey = (k: string | undefined, id: Property) => {
    if (k && !keys.has(k.toLowerCase())) keys.set(k.toLowerCase(), id)
  }
  const properties = Object.keys(OWN_WORDS.en).filter((k) => k !== 'stage' && k !== 'sprite') as Property[]
  const displayWords = [OWN_WORDS[display] ?? {}, LOCALES[display]?.words ?? {}]
  for (const source of [OWN_WORDS[code] ?? {}, l10nWords, OWN_WORDS.en, LOCALES.en?.words ?? {}, ...displayWords]) {
    for (const id of properties) addKey((source as any)[id], id)
  }
  addKey('x', 'x')
  addKey('y', 'y')
  for (const [k, id] of Object.entries(EXTRA_KEYS)) addKey(k, id)

  const displayWord = (id: 'stage' | 'sprite') => (displayWords[0] as any)[id] ?? (displayWords[1] as any)[id]
  const stageWords = [word('stage'), OWN_WORDS.en.stage!, displayWord('stage'), 'Bühne', 'Buehne']
    .filter(Boolean)
    .map((w) => w.toLowerCase())
  const spriteWords = [word('sprite'), OWN_WORDS.en.sprite!, displayWord('sprite'), 'Figur']
    .filter(Boolean)
    .map((w) => w.toLowerCase())

  const endAlias = Object.entries<string>(sbLocale?.aliases ?? {}).find(([, id]) => id === 'scratchblocks:end')?.[0]
  const words = {
    end: endAlias ?? 'end',
    else: sbLocale?.commands?.CONTROL_ELSE ?? 'else',
    define: (sbLocale?.definePrefix ?? ['define']).join(' ').trim() || 'define',
    defineSuffix: (sbLocale?.defineSuffix ?? []).join(' ').trim(),
    yes: t('yes', code),
    no: t('no', code),
  }

  const englishSpecText = (sbId: string) => {
    const spec = SPEC_OVERRIDES.en[sbId] ?? ENGLISH_SPECS[sbId]
    if (!spec) throw new Error(`no text for ${sbId}`)
    return spec.replace(/\s*@\w+/g, '').trim()
  }

  // Localized block text; icons without a readable alias become the unicode
  // symbols scratchblocks understands (⚑ ↻ ↺). Whether the resulting line
  // really reads back as the same block is checked by the writer (readsAs).
  const specText = (sbId: string): string => {
    const own = SPEC_OVERRIDES[code]?.[sbId]
    if (own) return own
    const native: string | undefined = code !== 'en' ? sbLocale?.commands?.[sbId] : undefined
    if (!native) return englishSpecText(sbId)
    return native
      .replace(/@\w+/g, (icon) => UNICODE_ICONS[icon] ?? '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const readCache = new Map<string, boolean>()
  const readsAs = (line: string, sbId: string): boolean => {
    const key = sbId + '\u0000' + line
    if (!readCache.has(key)) {
      if (readCache.size > 5000) readCache.clear()
      readCache.set(key, parsesAs(line, sbId, parseLanguages))
    }
    return readCache.get(key)!
  }

  const menuText = (key: string, value: string) => {
    const menu = MENUS[key]
    return squash(menu?.text[code]?.[value] ?? menu?.text.en[value] ?? value)
  }
  const englishMenuText = (key: string, value: string) => squash(MENUS[key]?.text.en[value] ?? value)

  const menuValue = (key: string, display: string) => {
    const menu = MENUS[key]
    if (!menu) return display
    const needle = squash(display).toLowerCase()
    for (const c of [code, 'en', display]) {
      for (const [value, text] of Object.entries(menu.text[c] ?? {})) {
        if (squash(text).toLowerCase() === needle) return value
      }
    }
    return display
  }

  const yesWords = new Set(['yes', 'true', 'ja', '1', words.yes.toLowerCase()])

  const language: TextLanguage = {
    code,
    parseLanguages,
    word,
    words,
    property: (key) => keys.get(key.trim().toLowerCase()),
    isStageWord: (w) => stageWords.includes(w.toLowerCase()),
    isSpriteWord: (w) => spriteWords.includes(w.toLowerCase()),
    isYes: (v) => yesWords.has(v.trim().toLowerCase()),
    specText,
    englishSpecText,
    readsAs,
    menuText,
    englishMenuText,
    menuValue,
    message: (key, ...args) => t(key, display, ...args),
  }
  cache.set(cacheKey, language)
  return language
}

/** menu texts as the parser sees them: trimmed, single spaces */
const squash = (text: string) => text.replace(/\s+/g, ' ').trim()

/** Does the text `line` parse back to the block `sbId`? */
function parsesAs(line: string, sbId: string, languages: string[]): boolean {
  try {
    const doc = parse(line, { languages })
    return doc.scripts[0]?.blocks[0]?.info?.id === sbId
  } catch {
    return false
  }
}
