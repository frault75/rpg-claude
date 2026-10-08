import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Input } from '../src/engine/input';
import { control, withControls } from '../src/ui/prompts';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('control hints', () => {
  it('name the key or button of the device in use, and only that one', () => {
    expect(control('rake', 'keys')).toEqual({ en: 'R', fr: 'R' });
    expect(control('rake', 'pad')).toEqual({ en: 'Y', fr: 'Y' });
    expect(control('rake', 'touch').en).toBe('the candle button');
    expect(control('confirm', 'keys')).toEqual({ en: 'Enter', fr: 'Entrée' });
    expect(withControls({ en: 'Hold {rake} to tilt the candle.', fr: 'Maintenez {rake} pour incliner la bougie.' }, 'pad')).toEqual({ en: 'Hold Y to tilt the candle.', fr: 'Maintenez Y pour incliner la bougie.' });
  });

  it('follow the device last used, unless the settings choose one', () => {
    const input = new Input();
    let changes = 0;
    input.onDevice(() => changes++);
    input.used('keys');
    input.used('pad');
    expect(input.prompts).toBe('pad');
    expect(control('confirm')).toEqual({ en: 'A', fr: 'A' });
    input.prefer('touch');
    expect(input.prompts).toBe('touch');
    input.used('keys');
    expect(input.prompts).toBe('touch');
    expect(changes).toBe(2);
  });

  it('no text in the game lists several devices at once', () => {
    const devices = /(gamepad|manette|mouse|souris|touch screen|écran tactile)/i;
    const offenders: string[] = [];
    for (const f of [...sources('src/maps'), ...sources('src/scenes'), ...sources('src/story'), 'src/i18n/strings.ts'])
      for (const [n, line] of readFileSync(f, 'utf8').split('\n').entries()) {
        // Settings name the devices on purpose; everything else says only what applies.
        if (/'settings\./.test(line) || !/en: '|fr: '|': '/.test(line)) continue;
        if (devices.test(line)) offenders.push(`${f}:${n + 1}`);
      }
    expect(offenders).toEqual([]);
  });
});
