// API for teacher-written checks (@Scratch.check). German names with English
// aliases; see README "Aufgaben mit Prüfung".

import type { LiaScratchElement } from './element'

function spriteState(target: any) {
  const costume = () => target.getCostumes()[target.currentCostume]?.name
  const says = () => target.getCustomState?.('Scratch.looks')?.text ?? ''
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

export function createCheckApi(element: LiaScratchElement) {
  const vm = element.vm
  const failures: string[] = []

  const allBlocks = () =>
    vm.runtime.targets
      .filter((t: any) => t.isOriginal)
      .flatMap((t: any) => Object.values<any>(t.blocks._blocks))
      .filter((b: any) => !b.shadow)

  const figur = (name: string) => {
    const target = vm.runtime.getSpriteTargetByName(name)
    if (!target) throw new Error(`Figur "${name}" gibt es nicht.`)
    return spriteState(target)
  }

  const bloecke = {
    anzahl: () => allBlocks().length,
    count: () => allBlocks().length,
    nutzt: (opcode: string) => allBlocks().some((b: any) => b.opcode === opcode),
    uses: (opcode: string) => allBlocks().some((b: any) => b.opcode === opcode),
  }

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
