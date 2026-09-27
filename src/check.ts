// API for teacher-written checks (@Scratch.check), see README "Tasks with checks".
// English names, with German aliases (lauf, erwarte, figur, buehne, bloecke).

import type { LiaScratchElement } from './element'
import { t } from './i18n'

function spriteState(target: any, said: Map<string, string>) {
  const costume = () => target.getCostumes()[target.currentCostume]?.name
  const says = () => target.getCustomState?.('Scratch.looks')?.text || said.get(target.id) || ''
  const variable = (name: string) => target.lookupVariableByNameAndType(name, '')?.value
  const list = (name: string) => target.lookupVariableByNameAndType(name, 'list')?.value
  return {
    get x() { return target.x },
    get y() { return target.y },
    get richtung() { return target.direction },
    get direction() { return target.direction },
    get größe() { return target.size },
    get groesse() { return target.size },
    get size() { return target.size },
    get kostüm() { return costume() },
    get kostuem() { return costume() },
    get costume() { return costume() },
    get sichtbar() { return target.visible },
    get visible() { return target.visible },
    get sagt() { return says() },
    get says() { return says() },
    variable,
    liste: list,
    list,
  }
}

function stageState(stage: any) {
  const backdrop = () => stage.getCostumes()[stage.currentCostume]?.name
  const variable = (name: string) => stage.lookupVariableByNameAndType(name, '')?.value
  const list = (name: string) => stage.lookupVariableByNameAndType(name, 'list')?.value
  return {
    get hintergrund() { return backdrop() },
    get backdrop() { return backdrop() },
    variable,
    liste: list,
    list,
  }
}

/** Hat blocks start a script: events, clones, own blocks (and extension hats). */
function isHat(opcode: string | undefined): boolean {
  return !!opcode && (/^event_when/.test(opcode) || /^control_start_as_clone$/.test(opcode) || /^procedures_definition$/.test(opcode) || /_when/.test(opcode))
}

export function createCheckApi(element: LiaScratchElement) {
  const vm = element.vm
  const failures: string[] = []

  const targetBlocks = (target: any) => Object.values<any>(target.blocks._blocks)

  const allTargets = () => vm.runtime.targets.filter((t: any) => t.isOriginal)

  const findTarget = (name: string) => {
    const target = allTargets().find((t: any) => t.getName() === name || (t.isStage && /^(stage|bühne|buehne)$/i.test(name)))
    if (!target) throw new Error(t('unknownSprite', undefined, name))
    return target
  }

  const ofTarget = (name: string): any => {
    const target = findTarget(name)
    return blockApi(() => [target])
  }

  /** Block queries over the blocks of the given targets (default: all). */
  const blockApi = (targets: () => any[]): any => {
    const raw = () => targets().flatMap(targetBlocks)
    // only blocks that can run: part of a script that starts with a hat block
    // (loose blocks next to a script do not count)
    const blocks = () => {
      const all = raw()
      const byId = new Map(all.map((b: any) => [b.id, b]))
      const top = (b: any) => {
        let cur = b
        for (let i = 0; cur?.parent && i < 10000; i++) cur = byId.get(cur.parent)
        return cur
      }
      return all.filter((b: any) => !b.shadow && isHat(top(b)?.opcode))
    }
    const count = (opcode?: string) =>
      opcode ? blocks().filter((b: any) => b.opcode === opcode).length : blocks().length
    const uses = (opcode: string) => blocks().some((b: any) => b.opcode === opcode)
    // values of a field (e.g. KEY_OPTION) of every block with this opcode,
    // also looking into the shadow blocks (menus) of its inputs
    const fields = (opcode: string, field: string) => {
      const byId = new Map(raw().map((b: any) => [b.id, b]))
      const values: string[] = []
      for (const b of blocks().filter((b: any) => b.opcode === opcode)) {
        if (b.fields?.[field]) values.push(String(b.fields[field].value))
        for (const input of Object.values<any>(b.inputs || {})) {
          const shadow: any = byId.get(input.shadow) ?? byId.get(input.block)
          if (shadow?.shadow && shadow.fields?.[field]) values.push(String(shadow.fields[field].value))
        }
      }
      return values
    }
    // every script as the list of its opcodes in running order (depth first:
    // the blocks inside a loop or if come right after the loop/if block)
    const scripts = () => {
      const all = raw()
      const byId = new Map(all.map((b: any) => [b.id, b]))
      const walk = (id: string | null, out: string[]) => {
        for (let b: any = id ? byId.get(id) : null; b; b = b.next ? byId.get(b.next) : null) {
          out.push(b.opcode)
          for (const name of ['SUBSTACK', 'SUBSTACK2']) {
            const input = b.inputs?.[name]
            if (input?.block) walk(input.block, out)
          }
        }
        return out
      }
      return all.filter((b: any) => b.topLevel && isHat(b.opcode)).map((b: any) => walk(b.id, []))
    }
    return {
      skripte: scripts,
      scripts,
      anzahl: count,
      count,
      nutzt: uses,
      uses,
      felder: fields,
      fields,
      von: (name: string) => ofTarget(name),
      of: (name: string) => ofTarget(name),
    }
  }

  const figur = (name: string) => {
    const target = vm.runtime.getSpriteTargetByName(name)
    if (!target) throw new Error(t('unknownSprite', undefined, name))
    return spriteState(target, element.saidAtEnd ?? new Map())
  }

  const bloecke = blockApi(allTargets)

  const lauf = (seconds = 5) => element.runFor(seconds)

  const erwarte = (condition: unknown, message: string) => {
    if (!condition) failures.push(message)
  }

  const buehne = stageState(vm.runtime.getTargetForStage())

  return {
    failures,
    api: {
      lauf,
      run: lauf,
      erwarte,
      expect: erwarte,
      figur,
      sprite: figur,
      buehne,
      stage: buehne,
      bloecke,
      blocks: bloecke,
    },
  }
}
