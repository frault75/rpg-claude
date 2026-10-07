/** Typography. System serif fonts only (no font files), drawn into canvas textures. */

export const SERIF = '"Palatino Linotype", "Book Antiqua", Palatino, "URW Palladio L", "P052", Georgia, "Times New Roman", serif';

export function font(size: number, opts: { italic?: boolean; bold?: boolean; smallCaps?: boolean } = {}): string {
  return `${opts.italic ? 'italic ' : ''}${opts.smallCaps ? 'small-caps ' : ''}${opts.bold ? '600 ' : ''}${size}px ${SERIF}`;
}

let measureCtx: CanvasRenderingContext2D | null = null;

export function measure(text: string, f: string): number {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 8;
  measureCtx.font = f;
  return measureCtx.measureText(text).width;
}

/** Greedy word wrap to a maximum width. */
export function wrap(text: string, f: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && measure(next, f) > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
