import { describe, expect, it } from 'vitest'
import { createCheckApi } from '../src/check'

// minimal fake of the scratch-vm targets the check API looks at
function target(name: string, blocks: any[], isStage = false) {
  return {
    isOriginal: true,
    isStage,
    getName: () => name,
    blocks: { _blocks: Object.fromEntries(blocks.map((b) => [b.id, b])) },
  }
}

const robo = target('Robo', [
  { id: 'a', opcode: 'event_whenkeypressed', topLevel: true, next: 'c', fields: { KEY_OPTION: { value: 'right arrow' } }, inputs: {} },
  { id: 'b', opcode: 'event_whenkeypressed', topLevel: true, fields: { KEY_OPTION: { value: 'left arrow' } }, inputs: {} },
  { id: 'c', opcode: 'event_broadcast', parent: 'a', fields: {}, inputs: { BROADCAST_INPUT: { block: 'd', shadow: 'd' } } },
  { id: 'z', opcode: 'motion_movesteps', fields: {}, inputs: {} }, // loose, not under a hat
  { id: 'd', opcode: 'event_broadcast_menu', parent: 'c', shadow: true, fields: { BROADCAST_OPTION: { value: 'Licht an' } }, inputs: {} },
])
const tower = target('Leuchtturm', [
  { id: 'e', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { value: 'Licht an' } }, inputs: {} },
])
const stage = target('Stage', [], true)

const element: any = {
  vm: {
    runtime: {
      targets: [stage, robo, tower],
      getTargetForStage: () => ({ getCostumes: () => [], currentCostume: 0, lookupVariableByNameAndType: () => undefined }),
      getSpriteTargetByName: () => undefined,
    },
  },
}

describe('check api: blocks', () => {
  const { api } = createCheckApi(element)

  it('counts all blocks and blocks of one opcode, ignoring shadows', () => {
    expect(api.blocks.count()).toBe(4)
    expect(api.bloecke.anzahl('event_whenkeypressed')).toBe(2)
    expect(api.blocks.count('motion_movesteps')).toBe(0)
  })

  it('ignores loose blocks that are not part of a script', () => {
    expect(api.blocks.uses('motion_movesteps')).toBe(false)
    expect(api.blocks.of('Robo').count()).toBe(3)
  })

  it('lists scripts in running order', () => {
    expect(api.bloecke.von('Robo').skripte()).toEqual([['event_whenkeypressed', 'event_broadcast'], ['event_whenkeypressed']])
  })

  it('reads field values, also from menu shadows', () => {
    expect(api.blocks.fields('event_whenkeypressed', 'KEY_OPTION')).toEqual(['right arrow', 'left arrow'])
    expect(api.bloecke.felder('event_broadcast', 'BROADCAST_OPTION')).toEqual(['Licht an'])
  })

  it('restricts queries to one sprite', () => {
    expect(api.blocks.of('Leuchtturm').count()).toBe(1)
    expect(api.bloecke.von('Robo').nutzt('event_whenbroadcastreceived')).toBe(false)
    expect(api.bloecke.von('Bühne').anzahl()).toBe(0)
    expect(() => api.blocks.of('Niemand')).toThrow()
  })
})

describe('check api: speech bubbles', () => {
  it('reads what a sprite said before the run was stopped', () => {
    const robo = { id: 'r1', getCustomState: () => undefined, getCostumes: () => [], currentCostume: 0 }
    const el: any = {
      saidAtEnd: new Map([['r1', 'Hallo!']]),
      vm: { runtime: { targets: [], getTargetForStage: () => ({ getCostumes: () => [], currentCostume: 0 }), getSpriteTargetByName: () => robo } },
    }
    const { api } = createCheckApi(el)
    expect(api.figur('Robo').sagt).toBe('Hallo!')
  })
})
