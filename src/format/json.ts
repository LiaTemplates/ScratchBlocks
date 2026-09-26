// Compact project.json format for code blocks.
//
// Differences to a plain sb3 project.json:
// * `meta` is omitted (and re-added on load),
// * library assets are written as `{"name": …, "asset": "<library key>"}`,
// * non-library assets are embedded as base64 in a `data` field,
// * every block sits on its own line, which keeps the text diff-friendly.

import { BACKDROPS, COSTUMES, SOUNDS, type LibraryCostume, type LibrarySound } from '../assets/library'
import { getAssetData, libraryIds, storeEmbeddedAsset } from '../engine'

export type ProjectJSON = {
  targets: any[]
  monitors?: any[]
  extensions?: string[]
  meta?: any
}

const META = { semver: '3.0.0', vm: '15.1.1', agent: 'LiaScript' }

function libraryEntry(key: string): LibraryCostume | LibrarySound | undefined {
  return COSTUMES[key] || BACKDROPS[key] || SOUNDS[key]
}

/** Parses the compact text into a loadable project.json object. */
export function parseJson(text: string): ProjectJSON {
  return expandProject(JSON.parse(text))
}

/** Resolves library/embedded assets and adds `meta`, so the VM can load it. */
export function expandProject(project: ProjectJSON): ProjectJSON {
  if (!Array.isArray(project.targets)) {
    throw new Error('project.json: "targets" is missing')
  }

  for (const target of project.targets) {
    target.costumes = (target.costumes || []).map(expandAsset)
    target.sounds = (target.sounds || []).map(expandAsset)
  }

  project.monitors = project.monitors || []
  project.extensions = project.extensions || []
  project.meta = { ...META, ...(project.meta || {}) }
  return project
}

function expandAsset(asset: any) {
  asset = { ...asset }

  if (asset.asset) {
    const lib = libraryEntry(asset.asset)
    const md5 = libraryIds.byKey.get(asset.asset)
    if (!lib || !md5) throw new Error(`unknown asset "${asset.asset}"`)
    asset.assetId = md5
    asset.dataFormat = lib.dataFormat
    asset.md5ext = `${md5}.${lib.dataFormat}`
    if ('rotationCenterX' in lib) {
      asset.rotationCenterX ??= lib.rotationCenterX
      asset.rotationCenterY ??= lib.rotationCenterY
      asset.bitmapResolution ??= lib.dataFormat === 'svg' ? 1 : 2
    } else {
      asset.rate ??= lib.rate
      asset.sampleCount ??= lib.sampleCount
    }
    delete asset.asset
  } else if (asset.data) {
    asset.assetId = storeEmbeddedAsset(asset.dataFormat, asset.data)
    asset.md5ext = `${asset.assetId}.${asset.dataFormat}`
    delete asset.data
  }

  return asset
}

function compactAsset(asset: any) {
  const key = libraryIds.byMd5.get(asset.assetId)

  if (key) {
    const lib = libraryEntry(key)
    const short: any = { name: asset.name, asset: key }
    if (lib && 'rotationCenterX' in lib) {
      if (asset.rotationCenterX !== lib.rotationCenterX) short.rotationCenterX = asset.rotationCenterX
      if (asset.rotationCenterY !== lib.rotationCenterY) short.rotationCenterY = asset.rotationCenterY
    }
    return short
  }

  const out = { ...asset }
  delete out.md5ext
  const data = getAssetData(asset.assetId)
  if (data) {
    delete out.assetId
    out.data = toBase64(data)
  }
  return out
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/** Serializes a project.json object into the compact text form. */
export function stringifyJson(project: ProjectJSON): string {
  const targets = project.targets.map((target) => {
    const t = { ...target }
    t.costumes = (t.costumes || []).map(compactAsset)
    t.sounds = (t.sounds || []).map(compactAsset)
    return t
  })

  const lines: string[] = ['{', '  "targets": [']

  targets.forEach((target, ti) => {
    const entries = Object.entries(target)
    lines.push('    {')
    entries.forEach(([key, value], ei) => {
      const comma = ei < entries.length - 1 ? ',' : ''
      if (key === 'blocks' && value && typeof value === 'object' && Object.keys(value).length) {
        const blocks = Object.entries(value as object)
        lines.push('      "blocks": {')
        blocks.forEach(([id, block], bi) => {
          lines.push(`        ${JSON.stringify(id)}: ${JSON.stringify(block)}${bi < blocks.length - 1 ? ',' : ''}`)
        })
        lines.push('      }' + comma)
      } else {
        lines.push(`      ${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`)
      }
    })
    lines.push('    }' + (ti < targets.length - 1 ? ',' : ''))
  })

  lines.push('  ],')
  lines.push(`  "monitors": ${JSON.stringify(project.monitors || [])},`)
  lines.push(`  "extensions": ${JSON.stringify(project.extensions || [])}`)
  lines.push('}')

  return lines.join('\n')
}
