// Prepares the prebuilt webpack bundles of scratch-vm/scratch-render for Parcel:
//
// * Parcel rejects `new Worker("<string literal>")`. scratch-vm only spawns this
//   worker for URL-loaded (non-builtin) extensions, which this template never
//   loads, so the literal is wrapped to keep Parcel from treating it as an entry.
// * The bundles reference `webpack://` source maps that Parcel tries (and fails)
//   to open, so the sourceMappingURL comments are removed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const files = [
  'node_modules/@scratch/scratch-vm/dist/web/scratch-vm.js',
  'node_modules/@scratch/scratch-render/dist/web/scratch-render.js',
  'node_modules/@scratch/scratch-storage/dist/web/scratch-storage.js',
]

for (const rel of files) {
  const file = join(process.cwd(), rel)
  if (!existsSync(file)) continue
  const src = readFileSync(file, 'utf8')
  const patched = src
    .replaceAll(
      'new Worker("./extension-worker.js")',
      'new Worker(String("./extension-worker.js"))'
    )
    .replace(/\n\/\/# sourceMappingURL=\S+\s*$/, '\n')
  if (patched !== src) {
    writeFileSync(file, patched)
    console.log('patched', rel)
  }
}
