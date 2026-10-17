import * as THREE from 'three'

export interface TLine { t: string; size: number; color?: string; font?: 'display' | 'mono'; italic?: boolean; weight?: number; gap?: number }

/** Draw typographic lines to a canvas texture — used for spatial typography in 3D (plaques, floating words, fake dialogs). */
export function textTexture(lines: TLine[], w = 1024, h = 512, opts: { bg?: string; align?: CanvasTextAlign; pad?: number; border?: string } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h) }
  if (opts.border) { g.strokeStyle = opts.border; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12) }
  const pad = opts.pad ?? 56
  const align = opts.align ?? 'left'
  g.textAlign = align; g.textBaseline = 'alphabetic'
  const total = lines.reduce((a, l) => a + l.size * 1.12 + (l.gap ?? 0), 0)
  let y = (h - total) / 2 + lines[0].size
  for (const l of lines) {
    const fam = l.font === 'mono' ? '"JetBrains Mono", monospace' : '"Instrument Serif", Georgia, serif'
    g.font = `${l.italic ? 'italic ' : ''}${l.weight ?? 400} ${l.size}px ${fam}`
    g.fillStyle = l.color ?? '#ece4d2'
    const x = align === 'center' ? w / 2 : align === 'right' ? w - pad : pad
    // naive wrap
    const words = l.t.split(' '); let line = ''
    const maxW = w - pad * 2
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += l.size * 1.1; line = wd } else line = test
    }
    g.fillText(line, x, y)
    y += l.size * 1.12 + (l.gap ?? 0)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('italic 40px "Instrument Serif"'),
      document.fonts.load('40px "Instrument Serif"'),
      document.fonts.load('700 20px "JetBrains Mono"'),
      document.fonts.load('400 20px "JetBrains Mono"'),
    ])
  } catch { /* fonts are optional for 3D text */ }
}
