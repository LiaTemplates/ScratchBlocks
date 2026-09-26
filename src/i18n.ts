// UI strings of the widget (block texts come from scratch-blocks).

const STRINGS = {
  de: {
    ok: 'OK',
    cancel: 'Abbrechen',
    makeBlock: 'Block erstellen',
    addInput: 'Eingabe (Zahl/Text)',
    addBoolean: 'Eingabe (Wahrheitswert)',
    addLabel: 'Beschriftung',
    runWithoutRefresh: 'Ohne Bildschirmaktualisierung laufen lassen',
    text: 'Text',
    blocks: 'Blöcke',
    fullscreen: 'Vollbild',
    loadSb3: 'sb3 laden',
    saveSb3: 'sb3 speichern',
    stage: 'Bühne',
    addSprite: 'Figur hinzufügen',
    deleteSprite: 'Figur löschen',
    answer: 'Antwort',
    textError: 'Der Text im Codeblock enthält einen Fehler:',
    ready: 'Bereit',
    passed: 'Geschafft!',
    failed: 'Noch nicht ganz:',
    checkError: 'Fehler in der Prüfung:',
    speak: 'Vorlesen',
    tooManyBlocks: 'Zu viele Blöcke',
  },
  en: {
    ok: 'OK',
    cancel: 'Cancel',
    makeBlock: 'Make a Block',
    addInput: 'Add an input (number or text)',
    addBoolean: 'Add an input (boolean)',
    addLabel: 'Add a label',
    runWithoutRefresh: 'Run without screen refresh',
    text: 'Text',
    blocks: 'Blocks',
    fullscreen: 'Full screen',
    loadSb3: 'Load sb3',
    saveSb3: 'Save sb3',
    stage: 'Stage',
    addSprite: 'Add sprite',
    deleteSprite: 'Delete sprite',
    answer: 'Answer',
    textError: 'The text in the code block contains an error:',
    ready: 'Ready',
    passed: 'Well done!',
    failed: 'Not quite:',
    checkError: 'Error in the check:',
    speak: 'Read aloud',
    tooManyBlocks: 'Too many blocks',
  },
}

export type Key = keyof typeof STRINGS.de
export type Lang = keyof typeof STRINGS

export function lang(): Lang {
  const l = (document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase()
  return l === 'de' ? 'de' : 'en'
}

export function t(key: Key): string {
  return STRINGS[lang()][key]
}
