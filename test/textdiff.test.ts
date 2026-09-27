import { describe, expect, it } from 'vitest'
import { diffLines, diffText, merge, type Edit } from '../src/textdiff'

function apply(text: string, edits: Edit[]): string {
  for (const e of [...edits].reverse()) text = text.slice(0, e.start) + e.text + text.slice(e.end)
  return text
}

const project = `when green flag clicked
move (10) steps
say [Hello!]

when this sprite clicked
turn right (15) degrees

when [space v] key pressed
next costume`

describe('diffText', () => {
  const cases: [string, string, string][] = [
    ['identical', project, project],
    ['change one value', project, project.replace('(10)', '(20)')],
    ['append a line', project, project + '\nsay [done]'],
    ['prepend a line', project, 'say [start]\n' + project],
    ['remove the last line', project, project.replace('\nnext costume', '')],
    ['remove the first line', project, project.replace('when green flag clicked\n', '')],
    ['add a script in the middle', project, project.replace('\n\nwhen this', '\n\nwhen this sprite clicked\nhide\n\nwhen this')],
    ['from empty', '', project],
    ['to empty', project, ''],
    ['trailing newline', project, project + '\n'],
    ['reorder scripts', project, project.split('\n\n').reverse().join('\n\n')],
    ['two separate changes', project, project.replace('(10)', '(20)').replace('(15)', '(90)')],
  ]
  for (const [name, a, b] of cases) {
    it(name, () => expect(apply(a, diffText(a, b))).toBe(b))
  }

  it('changes only what changed, like typing', () => {
    expect(diffText(project, project.replace('(10)', '(20)'))).toEqual([
      { start: project.indexOf('(10)') + 1, end: project.indexOf('(10)') + 2, text: '2' },
    ])
  })

  it('turns random texts into each other', () => {
    let seed = 1
    const random = (n: number) => ((seed = (seed * 16807) % 2147483647) % n)
    const text = () =>
      Array.from({ length: random(8) }, () => ['', 'a', 'b', 'ab', 'move (1)'][random(5)]).join('\n') +
      (random(2) ? '\n' : '')
    for (let k = 0; k < 2000; k++) {
      const a = text()
      const b = text()
      expect(apply(a, diffText(a, b))).toBe(b)
    }
  })

  it('keeps separate changes separate', () => {
    expect(diffText(project, project.replace('(10)', '(20)').replace('(15)', '(90)'))).toHaveLength(2)
  })
})

describe('diffLines', () => {
  it('finds the inserted lines', () => {
    expect(diffLines('a\nb\nc', 'a\nb\nx\nc')).toEqual([{ from: 2, to: 2, lines: ['x'] }])
  })
})

describe('merge', () => {
  const mineOnly = project.replace('(10)', '(20)')
  const theirsOnly = project.replace('next costume', 'next costume\nplay sound [pop v]')

  it('keeps both changes in different scripts', () => {
    expect(merge(project, mineOnly, theirsOnly)).toBe(
      project.replace('(10)', '(20)').replace('next costume', 'next costume\nplay sound [pop v]'),
    )
  })

  it('shifts my change behind lines they inserted before it', () => {
    const theirs = 'when this sprite clicked\nhide\n\n' + project
    const mine = project.replace('next costume', 'hide')
    expect(merge(project, mine, theirs)).toBe(theirs.replace('next costume', 'hide'))
  })

  it('keeps both new scripts added at the same place', () => {
    const mine = project + '\n\nwhen stage clicked\nshow'
    const theirs = project + '\n\nwhen loudness > (10)\nhide'
    const merged = merge(project, mine, theirs)
    expect(merged).toContain('when stage clicked\nshow')
    expect(merged).toContain('when loudness > (10)\nhide')
  })

  it('lets theirs win where both changed the same line', () => {
    const mine = project.replace('(10)', '(20)')
    const theirs = project.replace('(10)', '(30)')
    expect(merge(project, mine, theirs)).toBe(theirs)
  })

  it('is theirs when I changed nothing, mine when they changed nothing', () => {
    expect(merge(project, project, theirsOnly)).toBe(theirsOnly)
    expect(merge(project, mineOnly, project)).toBe(mineOnly)
  })
})
