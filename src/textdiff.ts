// Small, local text edits instead of replacing the whole code block.
//
// In a LiaScript classroom every ACE change is sent as a delta (insert/remove
// at an index) into a shared text. Replacing everything would make concurrent
// edits of two students collide; a few small edits — like typing — merge.

/** Replace lines [from, to) of the old text with `lines`. */
export interface Hunk {
  from: number
  to: number
  lines: string[]
}

/** Replace characters [start, end) of the old text with `text`. */
export interface Edit {
  start: number
  end: number
  text: string
}

// above this (changed lines × changed lines) a single hunk is good enough
const MAX_TABLE = 4_000_000

/** Line hunks that turn `a` into `b` (LCS based, in ascending order). */
export function diffLines(a: string, b: string): Hunk[] {
  const x = a.split('\n')
  const y = b.split('\n')

  let head = 0
  while (head < x.length && head < y.length && x[head] === y[head]) head++
  let tail = 0
  while (tail < x.length - head && tail < y.length - head && x[x.length - 1 - tail] === y[y.length - 1 - tail]) tail++

  const n = x.length - head - tail
  const m = y.length - head - tail
  if (n === 0 && m === 0) return []
  if (n === 0 || m === 0 || n * m > MAX_TABLE) {
    return [{ from: head, to: head + n, lines: y.slice(head, head + m) }]
  }

  // lcs[i * (m + 1) + j] = LCS length of x[head + i ..] and y[head + j ..]
  const w = m + 1
  const lcs = new Uint32Array((n + 1) * w)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] =
        x[head + i] === y[head + j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1])
    }
  }

  const hunks: Hunk[] = []
  let current: Hunk | null = null
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && x[head + i] === y[head + j]) {
      current = null
      i++
      j++
      continue
    }
    if (!current) {
      current = { from: head + i, to: head + i, lines: [] }
      hunks.push(current)
    }
    if (j < m && (i === n || lcs[i * w + j + 1] >= lcs[(i + 1) * w + j])) {
      current.lines.push(y[head + j++])
    } else {
      current.to = head + ++i
    }
  }
  return hunks
}

/** Character edits that turn `a` into `b`, each trimmed to what really changed. */
export function diffText(a: string, b: string): Edit[] {
  if (a === b) return []
  const offsets = lineOffsets(a)
  const edits: Edit[] = []
  for (const hunk of diffLines(a, b)) {
    if (hunk.from === offsets.length) {
      // behind the last line
      edits.push({ start: a.length, end: a.length, text: hunk.lines.map((line) => '\n' + line).join('') })
      continue
    }
    // lines are joined by '\n': cover the line break before or after the hunk
    let start = offsets[hunk.from]
    let end = hunk.to < offsets.length ? offsets[hunk.to] : a.length + 1
    let text = hunk.lines.map((line) => line + '\n').join('')
    if (end > a.length) {
      if (start > 0) {
        start--
        text = '\n' + text
      }
      end = a.length
      text = text.slice(0, -1)
    }
    edits.push(trim(a, { start, end, text }))
  }
  return edits.filter((e) => e.start !== e.end || e.text !== '')
}

/**
 * Three-way merge: applies the changes from `base` to `mine` on top of
 * `theirs` (which also started from `base`). Where both changed the same
 * lines, theirs wins — it is already shared with everyone else.
 */
export function merge(base: string, mine: string, theirs: string): string {
  if (mine === base) return theirs
  if (theirs === base || theirs === mine) return mine

  const ours = diffLines(base, mine)
  const others = diffLines(base, theirs)
  const lines = theirs.split('\n')

  const shifted: Hunk[] = []
  for (const hunk of ours) {
    if (others.some((other) => overlaps(hunk, other))) continue
    let shift = 0
    for (const other of others) {
      if (other.to <= hunk.from && (other.from < hunk.from || other.from === other.to)) {
        shift += other.lines.length - (other.to - other.from)
      }
    }
    shifted.push({ from: hunk.from + shift, to: hunk.to + shift, lines: hunk.lines })
  }
  for (const hunk of shifted.reverse()) lines.splice(hunk.from, hunk.to - hunk.from, ...hunk.lines)
  return lines.join('\n')
}

/** Two changes of the same base lines; insertions at the same place do not collide. */
function overlaps(a: Hunk, b: Hunk): boolean {
  const aInsert = a.from === a.to
  const bInsert = b.from === b.to
  if (aInsert && bInsert) return false
  if (aInsert) return b.from < a.from && a.from < b.to
  if (bInsert) return a.from < b.from && b.from < a.to
  return Math.max(a.from, b.from) < Math.min(a.to, b.to)
}

function lineOffsets(text: string): number[] {
  const offsets = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') offsets.push(i + 1)
  return offsets
}

function trim(a: string, edit: Edit): Edit {
  let { start, end, text } = edit
  let k = 0
  while (k < text.length && start + k < end && a[start + k] === text[k]) k++
  start += k
  text = text.slice(k)
  let l = 0
  while (l < text.length && end - l > start && a[end - 1 - l] === text[text.length - 1 - l]) l++
  return { start, end: end - l, text: text.slice(0, text.length - l) }
}
