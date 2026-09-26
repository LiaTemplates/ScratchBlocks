// Translations for VM extension blocks (the pen). scratch-gui gets them from
// scratch-l10n; the texts here match the scratchblocks locale, so the blocks in
// the toolbox read exactly like the text format writes them.

const DE: Record<string, string> = {
  'pen.categoryName': 'Malstift',
  'pen.clear': 'lösche alles',
  'pen.stamp': 'hinterlasse Abdruck',
  'pen.penDown': 'schalte Stift ein',
  'pen.penUp': 'schalte Stift aus',
  'pen.setColor': 'setze Stiftfarbe auf [COLOR]',
  'pen.changeColorParam': 'ändere Stift [COLOR_PARAM] um [VALUE]',
  'pen.setColorParam': 'setze Stift [COLOR_PARAM] auf [VALUE]',
  'pen.changeSize': 'ändere Stiftdicke um [SIZE]',
  'pen.setSize': 'setze Stiftdicke auf [SIZE]',
  'pen.setShade': 'setze Farbstärke auf [SHADE]',
  'pen.changeShade': 'ändere Farbstärke um [SHADE]',
  'pen.setHue': 'setze Stiftfarbe auf [HUE]',
  'pen.changeHue': 'ändere Stiftfarbe um [HUE]',
  'pen.colorMenu.color': 'Farbe',
  'pen.colorMenu.saturation': 'Sättigung',
  'pen.colorMenu.brightness': 'Helligkeit',
  'pen.colorMenu.transparency': 'Transparenz',
}

export const VM_MESSAGES: Record<string, Record<string, string>> = { de: DE, en: {} }
