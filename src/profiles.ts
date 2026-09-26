// Age-group profiles: which blocks are offered and how the editor behaves.

export interface Profile {
  /** allowed block opcodes, or 'all' */
  blocks: string[] | 'all'
  /** opcodes removed even if `blocks` is 'all' */
  exclude?: string[]
  /** load the pen extension */
  pen?: boolean
  /** start zoom of the block workspace */
  zoom: number
  /** children may add/remove sprites */
  sprites: boolean
  /** button to show the underlying code-block text */
  textView: boolean
  /** sb3 import/export buttons */
  sb3: boolean
  /** read blocks and prompts aloud (Web Speech API) */
  speech: boolean
  /** maximum number of blocks in the workspace (0 = unlimited) */
  maxBlocks: number
  /** reset sprites to their start state on every ▶ */
  resetOnRun: boolean
}

const LEVEL1 = [
  'event_whenflagclicked',
  'motion_movesteps',
  'motion_turnright',
  'motion_turnleft',
  'looks_sayforsecs',
  'looks_nextcostume',
  'control_wait',
  'control_repeat',
]

const LEVEL2 = [
  ...LEVEL1,
  'event_whenthisspriteclicked',
  'event_whenkeypressed',
  'motion_gotoxy',
  'motion_glidesecstoxy',
  'motion_changexby',
  'motion_changeyby',
  'motion_setx',
  'motion_sety',
  'motion_pointindirection',
  'motion_ifonedgebounce',
  'looks_say',
  'looks_think',
  'looks_thinkforsecs',
  'looks_switchcostumeto',
  'looks_costume',
  'looks_show',
  'looks_hide',
  'looks_changesizeby',
  'looks_setsizeto',
  'sound_play',
  'sound_playuntildone',
  'sound_sounds_menu',
  'control_forever',
  'control_if',
  'control_if_else',
  'sensing_touchingobject',
  'sensing_touchingobjectmenu',
  'sensing_keypressed',
  'sensing_keyoptions',
]

/** Everything except lists, custom blocks and clones. */
const LEVEL3_EXCLUDE = [
  'control_create_clone_of',
  'control_start_as_clone',
  'control_delete_this_clone',
  'data_listcontents',
  'data_addtolist',
  'data_deleteoflist',
  'data_deletealloflist',
  'data_insertatlist',
  'data_replaceitemoflist',
  'data_itemoflist',
  'data_itemnumoflist',
  'data_lengthoflist',
  'data_listcontainsitem',
  'data_showlist',
  'data_hidelist',
  'procedures_definition',
  'procedures_call',
  'sensing_username',
]

export const PROFILES: Record<string, Profile> = {
  level1: {
    blocks: LEVEL1,
    zoom: 1.1,
    sprites: false,
    textView: false,
    sb3: false,
    speech: true,
    maxBlocks: 0,
    resetOnRun: true,
  },
  level2: {
    blocks: LEVEL2,
    zoom: 0.9,
    sprites: false,
    textView: false,
    sb3: false,
    speech: true,
    maxBlocks: 0,
    resetOnRun: true,
  },
  level3: {
    blocks: 'all',
    exclude: LEVEL3_EXCLUDE,
    pen: true,
    zoom: 0.675,
    sprites: true,
    textView: true,
    sb3: false,
    speech: false,
    maxBlocks: 0,
    resetOnRun: true,
  },
  level4: {
    blocks: 'all',
    pen: true,
    zoom: 0.675,
    sprites: true,
    textView: true,
    sb3: true,
    speech: false,
    maxBlocks: 0,
    resetOnRun: true,
  },
}

/**
 * Resolves a profile name ("level1" … "level4", also "1" … "4" or the German
 * "stufe1" … "stufe4") or a JSON object, which extends a base profile via
 * `"base": "level2"`.
 */
export function resolveProfile(spec: string | null | undefined): Profile {
  const raw = (spec || '').trim()

  if (raw.startsWith('{')) {
    try {
      const custom = JSON.parse(raw)
      const base = resolveProfile(custom.base || 'level4')
      return { ...base, ...custom }
    } catch (e) {
      console.warn('LiaScratch: invalid profile', raw, e)
      return PROFILES.level4
    }
  }

  const key = raw.toLowerCase().replace(/^stufe(\d)$/, 'level$1').replace(/^(\d)$/, 'level$1')
  return PROFILES[key] || PROFILES.level4
}

/** Registers a named profile that extends `spec.base` (default: level4). */
export function defineProfile(name: string, spec: Partial<Profile> & { base?: string }) {
  const { base, ...rest } = spec
  PROFILES[name.toLowerCase()] = { ...resolveProfile(base || 'level4'), ...rest }
}

export function isAllowed(profile: Profile, opcode: string): boolean {
  if (profile.exclude?.includes(opcode)) return false
  return profile.blocks === 'all' || profile.blocks.includes(opcode)
}

/** Removes all blocks (and then empty categories) the profile does not allow. */
export function filterToolbox(xml: string, profile: Profile): string {
  if (profile.blocks === 'all' && !profile.exclude?.length) return xml

  const doc = new DOMParser().parseFromString(xml, 'text/xml')

  for (const category of Array.from(doc.querySelectorAll('category'))) {
    // Dynamic categories (variables, my blocks) are filtered in their callbacks.
    if (category.getAttribute('custom')) {
      if (category.getAttribute('custom') === 'PROCEDURE' && !isAllowed(profile, 'procedures_definition')) {
        removeWithGap(category)
      } else if (category.getAttribute('custom') === 'VARIABLE' && !hasDataBlocks(profile)) {
        removeWithGap(category)
      }
      continue
    }

    for (const block of Array.from(category.querySelectorAll(':scope > block'))) {
      if (!isAllowed(profile, block.getAttribute('type') || '')) {
        removeWithGap(block)
      }
    }

    // drop leading/trailing separators
    while (category.firstElementChild?.tagName === 'sep') category.firstElementChild.remove()

    if (!category.querySelector(':scope > block')) removeWithGap(category)
  }

  return new XMLSerializer().serializeToString(doc)
}

function hasDataBlocks(profile: Profile) {
  return profile.blocks === 'all' || profile.blocks.some((op) => op.startsWith('data_'))
}

function removeWithGap(el: Element) {
  const next = el.nextElementSibling
  if (next?.tagName === 'sep') next.remove()
  el.remove()
}
