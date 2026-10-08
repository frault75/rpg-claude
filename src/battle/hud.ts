/**
 * The battle screen's windows, drawn with Canvas 2D in logical units: the banderoles
 * (speech scrolls with each enemy's intent written in red), the party's window, the
 * command window, the help bar, floating numbers and the result banners.
 */

import { prefs } from '../engine/prefs';
import { drawManicule, drawWindow, INK, SERIF, shadowText, wrap } from '../ui/ui';

export const RED_INK = '#B3241E';

// ---------------------------------------------------------------------------------------
// Banderoles

export const BANDEROLE_W = 284;
export const BANDEROLE_H = 66;

export interface BanderoleLook {
  order: number;
  /** What it does, in a few words: "Looses an arrow". */
  text: string;
  /** What it deals, as the difficulty has it (0 for none). Whom it strikes is shown over their heads. */
  damage: number;
  /** A small line under the text: what else it does, "in 1", "waits". */
  note: string;
  hidden: boolean;
  /** 0..1: the red line crossing it out. */
  struck: number;
  /** Being performed now, or pointed at by the cursor. */
  active: boolean;
  /** Already performed this enemy phase. */
  spent: boolean;
  env: boolean;
}

let measurer: CanvasRenderingContext2D | null = null;

/** How wide a banderole has to be for what it says: no narrower than a short scroll, no wider than the full one. */
export function banderoleWidth(b: BanderoleLook): number {
  measurer ??= document.createElement('canvas').getContext('2d');
  const c = measurer!;
  const big = prefs.largeText;
  c.font = `italic 600 ${big ? 18 : 16}px ${SERIF}`;
  const deed = c.measureText(b.hidden ? '? ? ?' : b.text).width;
  c.font = `italic 600 ${big ? 13 : 12}px ${SERIF}`;
  const note = b.note ? c.measureText(b.note).width : 0;
  return Math.round(Math.max(120, Math.min(BANDEROLE_W, 54 + Math.max(deed, note) + blowSlot(c, b) + 26)));
}

const BLADE_W = 15;
const blowFont = () => `800 ${prefs.largeText ? 22 : 20}px ${SERIF}`;

/** Room kept at the scroll's right end for what the blow deals: a little blade and the number. */
function blowSlot(c: CanvasRenderingContext2D, b: BanderoleLook): number {
  if (b.hidden || b.damage <= 0) return 0;
  c.font = blowFont();
  return 14 + BLADE_W + 3 + c.measureText(String(b.damage)).width;
}

/** A small sword drawn in brown ink, its point to the upper right, centred on (x, y). */
function drawBlade(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(Math.PI / 4);
  c.translate(0, 0.5);
  c.fillStyle = '#3A2410';
  c.beginPath();
  c.moveTo(0, -11);
  c.lineTo(2.3, -8);
  c.lineTo(2.3, 3);
  c.lineTo(-2.3, 3);
  c.lineTo(-2.3, -8);
  c.closePath();
  c.fill();
  // The light along one edge of the blade.
  c.fillStyle = '#A8885C';
  c.fillRect(-1.3, -7.5, 1, 9.5);
  c.fillStyle = '#3A2410';
  c.fillRect(-5.6, 3, 11.2, 2.4);
  c.fillRect(-1.2, 5.4, 2.4, 3.6);
  c.beginPath();
  c.arc(0, 10.2, 2, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** A parchment scroll with rolled ends, its text in red ink, its order in a roundel. */
export function drawBanderole(c: CanvasRenderingContext2D, w: number, h: number, b: BanderoleLook): void {
  const top = 8;
  const bh = h - 16;
  const roll = 11;
  c.save();
  c.globalAlpha = b.spent ? 0.45 : 1;
  // Shadow.
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.ellipse(w / 2, h - 3, w / 2 - 16, 3, 0, 0, Math.PI * 2);
  c.fill();
  // The band, gently waved.
  const band = new Path2D();
  band.moveTo(roll, top + 2);
  band.bezierCurveTo(w * 0.35, top - 3, w * 0.65, top + 5, w - roll, top);
  band.lineTo(w - roll, top + bh - 2);
  band.bezierCurveTo(w * 0.65, top + bh + 3, w * 0.35, top + bh - 5, roll, top + bh);
  band.closePath();
  const g = c.createLinearGradient(0, top, 0, top + bh);
  const paper = b.env ? ['#DCE6EE', '#B8C8D8'] : ['#F5EAD0', '#DCC79C'];
  g.addColorStop(0, paper[0]!);
  g.addColorStop(1, paper[1]!);
  c.fillStyle = g;
  c.fill(band);
  c.strokeStyle = b.active ? INK.gold : 'rgba(90, 60, 30, 0.85)';
  c.lineWidth = b.active ? 2.4 : 1.4;
  c.stroke(band);
  // Rolled ends: little cylinders curling under.
  for (const [x, dir] of [
    [roll, -1],
    [w - roll, 1],
  ] as const) {
    const cg = c.createLinearGradient(x - 7, 0, x + 7, 0);
    cg.addColorStop(0, '#B89A68');
    cg.addColorStop(0.5, '#F2E2BC');
    cg.addColorStop(1, '#9A7C4C');
    c.fillStyle = cg;
    c.beginPath();
    c.ellipse(x + dir * 2, top + bh / 2 + (dir < 0 ? 1 : -1), 6.5, bh / 2 + 3, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(90, 60, 30, 0.85)';
    c.lineWidth = 1.2;
    c.stroke();
    c.fillStyle = 'rgba(80, 50, 20, 0.5)';
    c.beginPath();
    c.ellipse(x + dir * 3, top + bh / 2 + (dir < 0 ? 1 : -1), 2.2, bh / 2 - 2, 0, 0, Math.PI * 2);
    c.fill();
  }
  // The order roundel, red with a gold rim.
  const rx = 34;
  const ry = top + bh / 2;
  c.beginPath();
  c.arc(rx, ry, 13, 0, Math.PI * 2);
  c.fillStyle = b.env ? '#2B4C9C' : RED_INK;
  c.fill();
  c.strokeStyle = INK.gold;
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = '#FFF4D8';
  c.font = `700 17px ${SERIF}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(b.order), rx, ry + 1);
  // The deed in red (a Mummer's verse may take two lines), and under it, in small brown
  // italic, what else it does. What the blow deals sits at the scroll's right end, a blade and
  // a number, in the same place on every scroll; whom it strikes is marked over their heads.
  c.textAlign = 'left';
  const tx = 54;
  const slot = blowSlot(c, b);
  const tw = w - tx - 20 - slot;
  const size = prefs.largeText ? 18 : 16;
  const text = b.hidden ? '? ? ?' : b.text;
  let fs = size;
  c.font = `italic 600 ${fs}px ${SERIF}`;
  while (fs > 13 && c.measureText(text).width > tw) c.font = `italic 600 ${--fs}px ${SERIF}`;
  const lines = c.measureText(text).width > tw ? wrap(c, text, tw).slice(0, 2) : [text];
  const lh = fs + 2;
  let ns = prefs.largeText ? 13 : 12;
  c.font = `italic 600 ${ns}px ${SERIF}`;
  while (b.note && ns > 10 && c.measureText(b.note).width > tw) c.font = `italic 600 ${--ns}px ${SERIF}`;
  const noteH = b.note ? ns + 3 : 0;
  const ty = ry - (lines.length * lh + noteH) / 2 + lh / 2;
  c.textBaseline = 'middle';
  c.font = `italic 600 ${fs}px ${SERIF}`;
  c.fillStyle = b.env ? '#1E3466' : RED_INK;
  lines.forEach((l, i) => c.fillText(l, tx, ty + i * lh));
  if (b.note) {
    c.font = `italic 600 ${ns}px ${SERIF}`;
    c.fillStyle = '#5A3C1C';
    c.fillText(b.note, tx, ty + lines.length * lh - lh / 2 + noteH / 2 + 1);
  }
  if (slot) {
    c.font = blowFont();
    const n = String(b.damage);
    const nx = w - 20 - c.measureText(n).width;
    c.fillStyle = b.env ? '#1E3466' : RED_INK;
    c.fillText(n, nx, ry + 1);
    drawBlade(c, nx - 3 - BLADE_W / 2, ry);
  }
  const textW = tw + slot;
  // Struck through.
  if (b.struck > 0) {
    c.strokeStyle = '#D8202A';
    c.lineWidth = 3.2;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(tx - 4, ry + 3);
    c.lineTo(tx - 4 + (textW + 8) * Math.min(1, b.struck), ry - 4);
    c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------------------------------
// The party window

export interface PartyRow {
  name: string;
  place: string;
  hp: number;
  maxHp: number;
  chips: { text: string; color: string }[];
  acted: boolean;
  fallen: boolean;
  selected: boolean;
  /** Ink pips, for Isot. */
  ink?: { n: number; max: number; label: string };
}

export const PARTY_W = 600;

export function partyHeight(rows: number): number {
  return 26 + rows * 50;
}

export function drawParty(c: CanvasRenderingContext2D, w: number, h: number, rows: PartyRow[], hpLabel: string, time: number): void {
  drawWindow(c, 0, 0, w, h);
  rows.forEach((r, i) => {
    const y = 14 + i * 50;
    if (r.selected) {
      const g = c.createLinearGradient(14, 0, w - 14, 0);
      g.addColorStop(0, 'rgba(232,199,106,0.28)');
      g.addColorStop(1, 'rgba(232,199,106,0)');
      c.fillStyle = g;
      c.fillRect(12, y, w - 24, 46);
      drawManicule(c, 26, y + 22, 0.9 + Math.sin(time * 6) * 0.03);
    }
    c.globalAlpha = r.fallen ? 0.5 : r.acted ? 0.7 : 1;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.font = `600 12px ${SERIF}`;
    c.fillStyle = INK.gold;
    c.fillText(r.place.toUpperCase(), 46, y + 12);
    c.font = `600 22px ${SERIF}`;
    shadowText(c, r.name, 46, y + 32, r.fallen ? INK.dim : INK.text);
    // HP bar.
    const bx = 178;
    const bw = 170;
    const k = Math.max(0, r.hp / r.maxHp);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(bx, y + 30, bw, 7);
    const g = c.createLinearGradient(bx, 0, bx + bw, 0);
    if (k > 0.5) {
      g.addColorStop(0, '#5FBF6A');
      g.addColorStop(1, '#A8E07A');
    } else if (k > 0.25) {
      g.addColorStop(0, '#D8A030');
      g.addColorStop(1, '#F0D060');
    } else {
      g.addColorStop(0, '#C03A2A');
      g.addColorStop(1, '#F07050');
    }
    c.fillStyle = g;
    c.fillRect(bx, y + 30, bw * k, 7);
    c.strokeStyle = 'rgba(232,199,106,0.6)';
    c.lineWidth = 1;
    c.strokeRect(bx - 0.5, y + 29.5, bw + 1, 8);
    c.font = `600 12px ${SERIF}`;
    c.fillStyle = INK.dim;
    c.fillText(hpLabel, bx, y + 16);
    c.textAlign = 'right';
    c.font = `600 20px ${SERIF}`;
    shadowText(c, `${Math.max(0, Math.round(r.hp))}`, bx + bw - 34, y + 15);
    c.font = `15px ${SERIF}`;
    shadowText(c, `/${r.maxHp}`, bx + bw, y + 17, INK.dim);
    c.textAlign = 'left';
    // Status chips, then Ink.
    let cx = bx + bw + 16;
    if (r.ink) {
      c.font = `600 12px ${SERIF}`;
      c.fillStyle = INK.dim;
      c.fillText(r.ink.label, cx, y + 12);
      for (let p = 0; p < r.ink.max; p++) {
        const px = cx + 6 + p * 15;
        const py = y + 31;
        c.beginPath();
        c.moveTo(px, py - 8);
        c.quadraticCurveTo(px + 6, py, px, py + 5);
        c.quadraticCurveTo(px - 6, py, px, py - 8);
        const full = p < r.ink.n;
        if (full) {
          const ig = c.createLinearGradient(px - 5, py - 8, px + 5, py + 5);
          ig.addColorStop(0, '#7A98F0');
          ig.addColorStop(0.55, '#1C2458');
          ig.addColorStop(1, '#06081A');
          c.fillStyle = ig;
          c.fill();
        }
        c.setLineDash(full ? [] : [2, 2]);
        c.strokeStyle = full ? '#C8D8FF' : 'rgba(232,199,106,0.55)';
        c.lineWidth = 1.2;
        c.stroke();
        c.setLineDash([]);
        if (full) {
          c.fillStyle = '#F0F4FF';
          c.fillRect(px - 2.5, py - 3, 1.5, 2.5);
        }
      }
      cx += 18 + r.ink.max * 15;
    }
    c.font = `600 13px ${SERIF}`;
    for (const chip of r.chips) {
      const tw = c.measureText(chip.text).width + 12;
      if (cx + tw > w - 14) break;
      c.fillStyle = chip.color;
      c.beginPath();
      c.roundRect(cx, y + 22, tw, 18, 9);
      c.fill();
      c.fillStyle = '#10142A';
      c.fillText(chip.text, cx + 6, y + 31.5);
      cx += tw + 5;
    }
    c.globalAlpha = 1;
  });
}

// ---------------------------------------------------------------------------------------
// The command window

export interface CommandEntry {
  label: string;
  right?: string;
  disabled?: boolean;
  /** Shown with a tick (allies who have acted). */
  done?: boolean;
}

export const COMMAND_W = 330;
export const COMMAND_ROW = 38;

export function commandHeight(n: number): number {
  return 54 + n * COMMAND_ROW;
}

export function drawCommands(c: CanvasRenderingContext2D, w: number, h: number, title: string, entries: CommandEntry[], cursor: number, time: number, keys = false): void {
  drawWindow(c, 0, 0, w, h);
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.font = `600 15px ${SERIF}`;
  c.fillStyle = INK.gold;
  c.fillText(title.toUpperCase(), 26, 26);
  c.fillStyle = 'rgba(232,199,106,0.5)';
  c.fillRect(22, 40, w - 44, 1);
  entries.forEach((e, i) => {
    const y = 48 + i * COMMAND_ROW + COMMAND_ROW / 2;
    if (i === cursor) {
      const g = c.createLinearGradient(30, 0, w - 20, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.16)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(20, y - COMMAND_ROW / 2 + 3, w - 40, COMMAND_ROW - 6);
      drawManicule(c, 36 + Math.sin(time * 7) * 2, y, 0.95);
    }
    if (keys && i < 5 && i !== cursor) {
      // The key that picks it, small and quiet where the manicule would be.
      c.font = `600 13px ${SERIF}`;
      c.textAlign = 'center';
      c.fillStyle = 'rgba(232,199,106,0.45)';
      c.fillText(String(i + 1), 38, y + 1);
      c.textAlign = 'left';
    }
    c.font = `${prefs.largeText ? 23 : 21}px ${SERIF}`;
    shadowText(c, e.label, 58, y, e.disabled ? 'rgba(185,179,166,0.55)' : INK.text);
    if (e.done) {
      c.font = `600 18px ${SERIF}`;
      shadowText(c, '✓', 58 + c.measureText(e.label).width + 0, y, INK.gold);
    }
    if (e.right) {
      c.textAlign = 'right';
      c.font = `15px ${SERIF}`;
      shadowText(c, e.right, w - 26, y + 1, e.disabled ? 'rgba(185,179,166,0.5)' : INK.dim);
      c.textAlign = 'left';
    }
  });
}

// ---------------------------------------------------------------------------------------
// Help bar, ability callout, banners, floating numbers

export function drawHelp(c: CanvasRenderingContext2D, w: number, h: number, text: string, warn: boolean): void {
  drawWindow(c, 0, 0, w, h, 0.9);
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  c.font = `${prefs.largeText ? 21 : 19}px ${SERIF}`;
  const lines = wrap(c, text, w - 60).slice(0, 2);
  lines.forEach((l, i) => shadowText(c, l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 22, warn ? '#F4A080' : INK.text));
}

export const TIP_W = 620;

const tipFonts = () => {
  const big = prefs.largeText;
  return { title: `italic 700 ${big ? 22 : 20}px ${SERIF}`, body: `${big ? 20 : 18}px ${SERIF}`, lh: big ? 26 : 24, next: `italic ${big ? 15 : 14}px ${SERIF}` };
};

/** The height a first-time tip needs for its words. */
export function tipHeight(body: string): number {
  const c = document.createElement('canvas').getContext('2d')!;
  const f = tipFonts();
  c.font = f.body;
  return 92 + wrap(c, body, TIP_W - 72).length * f.lh;
}

/**
 * A first-time tip, written on a slip of vellum like the banderoles: its subject as a rubric
 * in red, a line or two in brown ink, and how to go on.
 */
export function drawTip(c: CanvasRenderingContext2D, w: number, h: number, title: string, body: string, next: string): void {
  const f = tipFonts();
  // Shadow, then the slip, its long edges a little uneven.
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(10, 12, w - 14, h - 14);
  const slip = new Path2D();
  slip.moveTo(6, 6);
  for (let x = 6; x <= w - 6; x += 24) slip.lineTo(x, 6 + Math.sin(x * 0.37) * 1.2);
  slip.lineTo(w - 6, h - 8);
  for (let x = w - 6; x >= 6; x -= 24) slip.lineTo(x, h - 8 + Math.sin(x * 0.29 + 1) * 1.2);
  slip.closePath();
  const g = c.createLinearGradient(0, 6, 0, h - 8);
  g.addColorStop(0, '#F6ECD2');
  g.addColorStop(1, '#DCC79C');
  c.fillStyle = g;
  c.fill(slip);
  c.strokeStyle = 'rgba(90, 60, 30, 0.85)';
  c.lineWidth = 1.4;
  c.stroke(slip);
  // The ruled margin a scribe writes against.
  c.strokeStyle = 'rgba(176, 40, 30, 0.45)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(24, 14);
  c.lineTo(24, h - 16);
  c.stroke();
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.font = f.title;
  c.fillStyle = RED_INK;
  c.fillText(title, 36, 32);
  c.font = f.body;
  c.fillStyle = '#3A2410';
  wrap(c, body, w - 72).forEach((l, i) => c.fillText(l, 36, 62 + i * f.lh));
  c.textAlign = 'right';
  c.font = f.next;
  c.fillStyle = '#7A5A34';
  c.fillText(`${next}  ›`, w - 22, h - 24);
}

/** The name of the ability being used, as the old games showed it. */
export function drawCallout(c: CanvasRenderingContext2D, w: number, h: number, text: string): void {
  drawWindow(c, 0, 0, w, h, 0.92);
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  c.font = `600 24px ${SERIF}`;
  const g = c.createLinearGradient(0, 10, 0, h - 10);
  g.addColorStop(0, '#FFF1C4');
  g.addColorStop(1, '#D9A848');
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillText(text, w / 2 + 1.5, h / 2 + 1.5);
  c.fillStyle = g;
  c.fillText(text, w / 2, h / 2);
}

export function drawBanner(c: CanvasRenderingContext2D, w: number, h: number, title: string, line: string, dark: boolean): void {
  const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
  g.addColorStop(0, dark ? 'rgba(20, 2, 4, 0.7)' : 'rgba(4, 8, 24, 0.6)');
  g.addColorStop(1, 'rgba(4, 8, 24, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `500 46px ${SERIF}`;
  const caps = title.toUpperCase().split('').join(' ');
  c.fillStyle = 'rgba(0,0,0,0.7)';
  c.fillText(caps, w / 2 + 2, h / 2 - 16 + 2);
  const tg = c.createLinearGradient(0, h / 2 - 40, 0, h / 2 + 8);
  tg.addColorStop(0, dark ? '#FFC8B0' : '#FFF1C4');
  tg.addColorStop(1, dark ? '#B83A2A' : '#D9A848');
  c.fillStyle = tg;
  c.fillText(caps, w / 2, h / 2 - 16);
  const tw = Math.min(w - 60, c.measureText(caps).width + 80);
  const rg = c.createLinearGradient(w / 2 - tw / 2, 0, w / 2 + tw / 2, 0);
  rg.addColorStop(0, 'rgba(232,199,106,0)');
  rg.addColorStop(0.5, 'rgba(232,199,106,0.95)');
  rg.addColorStop(1, 'rgba(232,199,106,0)');
  c.fillStyle = rg;
  c.fillRect(w / 2 - tw / 2, h / 2 + 14, tw, 1.5);
  c.font = `italic 22px ${SERIF}`;
  shadowText(c, line, w / 2, h / 2 + 42, '#E8DCC0');
}

// ---------------------------------------------------------------------------------------
// The spoils: what a won fight gave, and the level it brought (DESIGN.md §5.16)

export const SPOILS_W = 540;

export interface SpoilsLook {
  title: string;
  xp: { label: string; amount: number };
  pennies: { label: string; amount: number; purse: string };
  /** The level bar: its label, and how full (0..1). */
  bar: { label: string; fill: number };
  /** The level gained, once the bar has filled; `rise` is how far it has appeared (0..1). */
  levelUp?: { title: string; line: string; hp: string; ranks: { name: string; rule: string }[] };
  rise: number;
}

export function spoilsHeight(s: Pick<SpoilsLook, 'levelUp'>): number {
  return 156 + (s.levelUp ? 104 + s.levelUp.ranks.length * 30 : 0);
}

export function drawSpoils(c: CanvasRenderingContext2D, w: number, h: number, s: SpoilsLook): void {
  drawWindow(c, 0, 0, w, h, 0.94);
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  c.font = `600 15px ${SERIF}`;
  c.fillStyle = INK.gold;
  c.fillText(s.title.toUpperCase().split('').join(' '), w / 2, 28);
  c.fillStyle = 'rgba(232,199,106,0.5)';
  c.fillRect(30, 44, w - 60, 1);
  const line = (y: number, label: string, amount: number, aside = '') => {
    c.textAlign = 'left';
    c.font = `${prefs.largeText ? 21 : 19}px ${SERIF}`;
    shadowText(c, label, 36, y);
    c.textAlign = 'right';
    c.font = `700 21px ${SERIF}`;
    const n = `+${amount}`;
    shadowText(c, n, w - 36, y, INK.gold);
    if (aside) {
      c.font = `italic 15px ${SERIF}`;
      shadowText(c, aside, w - 50 - c.measureText(n).width * 1.15, y + 1, INK.dim);
    }
  };
  line(70, s.xp.label, s.xp.amount);
  line(100, s.pennies.label, s.pennies.amount, s.pennies.purse);
  // The level bar.
  c.textAlign = 'left';
  c.font = `600 16px ${SERIF}`;
  shadowText(c, s.bar.label, 36, 132, INK.gold);
  const bx = 150;
  const bw = w - 36 - bx;
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.fillRect(bx, 127, bw, 10);
  const g = c.createLinearGradient(bx, 0, bx + bw, 0);
  g.addColorStop(0, '#9A7428');
  g.addColorStop(1, '#F6DC8A');
  c.fillStyle = g;
  c.fillRect(bx, 127, bw * Math.max(0, Math.min(1, s.bar.fill)), 10);
  c.strokeStyle = 'rgba(232,199,106,0.6)';
  c.lineWidth = 1;
  c.strokeRect(bx + 0.5, 126.5, bw - 1, 11);
  const up = s.levelUp;
  if (!up || s.rise <= 0) return;
  c.save();
  c.globalAlpha = Math.min(1, s.rise);
  const y0 = 156;
  c.fillStyle = 'rgba(232,199,106,0.35)';
  c.fillRect(30, y0, w - 60, 1);
  c.textAlign = 'center';
  c.font = `500 30px ${SERIF}`;
  const caps = up.title.toUpperCase().split('').join(' ');
  const tg = c.createLinearGradient(0, y0 + 14, 0, y0 + 46);
  tg.addColorStop(0, '#FFF1C4');
  tg.addColorStop(1, '#D9A848');
  c.fillStyle = 'rgba(0,0,0,0.65)';
  c.fillText(caps, w / 2 + 1.5, y0 + 31.5);
  c.fillStyle = tg;
  c.fillText(caps, w / 2, y0 + 30);
  c.font = `italic 17px ${SERIF}`;
  shadowText(c, up.line, w / 2, y0 + 60, '#E8DCC0');
  c.font = `16px ${SERIF}`;
  shadowText(c, up.hp, w / 2, y0 + 86, INK.text);
  up.ranks.forEach((r, i) => {
    const y = y0 + 116 + i * 30;
    c.font = `600 17px ${SERIF}`;
    const nw = c.measureText(r.name).width;
    c.font = `16px ${SERIF}`;
    const rest = ` — ${r.rule}`;
    const x = w / 2 - (nw + c.measureText(rest).width) / 2;
    c.textAlign = 'left';
    c.font = `600 17px ${SERIF}`;
    shadowText(c, r.name, x, y, INK.gold);
    c.font = `16px ${SERIF}`;
    shadowText(c, rest, x + nw, y, INK.text);
    c.textAlign = 'center';
  });
  c.restore();
}

export type NumberKind = 'damage' | 'heal' | 'ward' | 'big' | 'penance' | 'word';

export function drawNumber(c: CanvasRenderingContext2D, w: number, h: number, text: string, kind: NumberKind): void {
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const size = kind === 'big' ? 46 : kind === 'word' ? 22 : kind === 'ward' || kind === 'penance' ? 22 : 34;
  c.font = `${kind === 'word' ? 'italic 600' : '700'} ${size}px ${SERIF}`;
  const fill: Record<NumberKind, [string, string]> = {
    damage: ['#FFFFFF', '#E8E0D0'],
    heal: ['#C8FFB0', '#5CC860'],
    ward: ['#D8E8FF', '#7AA0F0'],
    big: ['#FFF4C0', '#E8A030'],
    penance: ['#FFC8C0', '#D86050'],
    word: ['#FFF1C4', '#E8C76A'],
  };
  c.lineJoin = 'round';
  c.lineWidth = kind === 'word' ? 4 : 5;
  c.strokeStyle = 'rgba(10, 8, 20, 0.9)';
  c.strokeText(text, w / 2, h / 2);
  const g = c.createLinearGradient(0, h / 2 - size / 2, 0, h / 2 + size / 2);
  g.addColorStop(0, fill[kind][0]);
  g.addColorStop(1, fill[kind][1]);
  c.fillStyle = g;
  c.fillText(text, w / 2, h / 2);
}

/** The pointing hand turned downwards, over a target. */
export function drawTargetHand(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.save();
  c.translate(w / 2, h / 2);
  c.rotate(Math.PI / 2);
  drawManicule(c, 0, 0, 1.3);
  c.restore();
}
