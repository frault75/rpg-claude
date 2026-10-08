/** The menus' look: lapis windows with gold borders, in the game's serif. */

export const MENU_CSS = /* css */ `
#menu {
  position: fixed; inset: 0; z-index: 30; display: none;
  background: radial-gradient(ellipse at 50% 45%, rgba(8, 14, 40, 0.25), rgba(2, 4, 14, 0.78));
  -webkit-backdrop-filter: blur(5px) saturate(0.75); backdrop-filter: blur(5px) saturate(0.75);
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, 'Iowan Old Style', 'Times New Roman', serif;
  color: #F4EEE0; user-select: none; -webkit-user-select: none; touch-action: manipulation;
}
#menu.open { display: block; animation: menu-in 0.28s ease-out; }
@keyframes menu-in { from { opacity: 0; } to { opacity: 1; } }
#menu .frame { position: absolute; display: flex; gap: 1.1em; box-sizing: border-box; padding: 1.6em 2em; }
#menu .win {
  position: relative; box-sizing: border-box;
  background: linear-gradient(180deg, #2B4C9C 0%, #172C68 55%, #0E1A44 100%);
  border: 2px solid #D9B45A; border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.7), inset 0 0 0 5px rgba(14, 26, 68, 0.55), inset 0 0 0 6px rgba(232, 199, 106, 0.5), 0 12px 34px rgba(0, 0, 0, 0.65);
  animation: win-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes win-in { from { transform: translateY(0.6em); opacity: 0; } to { transform: none; opacity: 1; } }
#menu .win::before {
  content: ''; position: absolute; inset: 0; border-radius: 9px; pointer-events: none;
  background: radial-gradient(ellipse at 20% -10%, rgba(170, 200, 255, 0.24), rgba(170, 200, 255, 0) 60%);
}
#menu .fl { position: absolute; width: 0.55em; height: 0.55em; background: #E8C76A; transform: rotate(45deg); box-shadow: 0 0 0.3em rgba(255, 220, 140, 0.6); }
#menu .fl.tl { left: -0.3em; top: -0.3em; } #menu .fl.tr { right: -0.3em; top: -0.3em; }
#menu .fl.bl { left: -0.3em; bottom: -0.3em; } #menu .fl.br { right: -0.3em; bottom: -0.3em; }
#menu .side { width: 13.5em; padding: 1.1em 0.6em; align-self: flex-start; }
#menu .side .crest { text-align: center; color: #E8C76A; font-variant: small-caps; letter-spacing: 0.12em; font-size: 1.05em; margin: 0.1em 0 0.7em; }
#menu .content { flex: 1; padding: 1.1em 1.3em; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #9A7428 transparent; }
#menu h2 { font-weight: 600; font-variant: small-caps; letter-spacing: 0.06em; color: #E8C76A; margin: 0 0 0.25em 0.2em; font-size: 1.35em; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6); }
#menu .help { color: #C9C3B6; font-style: italic; margin: 0 0.4em 0.8em; font-size: 0.88em; line-height: 1.35; }
#menu .row { display: flex; align-items: center; gap: 0.6em; padding: 0.42em 0.8em 0.42em 2.1em; border-radius: 6px; position: relative; min-height: 1.7em; cursor: pointer; transition: background 0.12s; text-shadow: 0 1.5px 0 rgba(0, 0, 0, 0.7); }
#menu .row.static { cursor: default; padding-left: 0.8em; }
#menu .row.dim { color: #8E8A80; }
#menu .row.focus { background: linear-gradient(90deg, rgba(232, 199, 106, 0.24), rgba(232, 199, 106, 0.04) 70%, rgba(232, 199, 106, 0)); }
#menu .row .cursor { position: absolute; left: 0.1em; top: 50%; width: 1.7em; height: 1.1em; margin-top: -0.55em; visibility: hidden; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.6)); }
#menu .row.focus .cursor { visibility: visible; animation: point 0.8s ease-in-out infinite alternate; }
@keyframes point { from { transform: translateX(-0.12em); } to { transform: translateX(0.12em); } }
#menu .side .row.active { color: #F6DC8A; }
#menu .label { flex: 1; }
#menu .value { color: #F6DC8A; white-space: nowrap; display: flex; align-items: center; gap: 0.4em; }
#menu .arrow { color: #C9A040; padding: 0 0.25em; }
#menu .bar { width: 10em; height: 0.55em; background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(232, 199, 106, 0.6); border-radius: 0.3em; overflow: hidden; }
#menu .fill { height: 100%; background: linear-gradient(90deg, #9A7428, #F6DC8A); }
#menu .chip { border: 1px solid rgba(232, 199, 106, 0.7); border-radius: 0.3em; padding: 0.02em 0.45em; font: 600 0.8em system-ui, sans-serif; background: rgba(0, 0, 0, 0.32); color: #F4EEE0; }
#menu .chip.wait { animation: blink 0.6s steps(2) infinite; }
@keyframes blink { to { opacity: 0.35; } }
#menu .sep { height: 1px; margin: 0.55em 0.4em; background: linear-gradient(90deg, rgba(232, 199, 106, 0), rgba(232, 199, 106, 0.6), rgba(232, 199, 106, 0)); }
#menu .member { display: flex; gap: 0.9em; align-items: flex-start; padding: 0.5em 0.6em; }
#menu .member canvas { width: 5.6em; height: 5.6em; image-rendering: pixelated; border: 1px solid rgba(232, 199, 106, 0.75); background: linear-gradient(#0A1230, #1A2C66); flex: none; }
#menu .member .name { font-size: 1.2em; color: #F6DC8A; font-variant: small-caps; letter-spacing: 0.04em; }
#menu .member .meta { color: #C9C3B6; font-size: 0.85em; margin: 0.1em 0 0.35em; }
#menu .member .abil { font-size: 0.86em; line-height: 1.35; }
#menu .member .abil b { color: #F4EEE0; font-weight: 600; }
#menu .member .abil span { color: #C9C3B6; }
#menu .hpbar { display: inline-block; width: 6em; height: 0.45em; background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(232, 199, 106, 0.5); border-radius: 0.25em; vertical-align: middle; margin-left: 0.4em; overflow: hidden; }
#menu .hpbar i { display: block; height: 100%; background: linear-gradient(90deg, #3E9A5A, #9AE08A); }
#menu .xpbar i { background: linear-gradient(90deg, #9A7428, #F6DC8A); }
#menu .section { color: #C9A040; font-variant: small-caps; letter-spacing: 0.03em; }
#menu .have { color: #C9A040; font-size: 0.82em; font-variant: small-caps; margin-left: 0.3em; }
#menu .gem { width: 0.8em; height: 0.8em; transform: rotate(45deg); border: 1px solid rgba(255, 240, 200, 0.8); flex: none; box-shadow: 0 0 0.35em rgba(255, 220, 140, 0.5); }
#menu .item-text { display: block; font-size: 0.82em; color: #C9C3B6; font-style: normal; }
#menu .item-lore { display: block; font-size: 0.78em; color: #9AA2C0; font-style: italic; }
#menu .toast { position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%); padding: 0.5em 1.4em; animation: win-in 0.25s ease-out; }
#menu .quest-k { color: #E8C76A; font-variant: small-caps; letter-spacing: 0.08em; font-size: 0.9em; }
#menu .quest { display: block; font-style: italic; font-size: 1.1em; line-height: 1.45; padding: 0.35em 0.9em; border-left: 3px solid #B0302A; background: rgba(0, 0, 0, 0.2); border-radius: 0 6px 6px 0; }
#menu .lost { font-size: 0.92em; line-height: 1.35; }
#menu .lost.none { font-style: italic; letter-spacing: 0.04em; }
#menu .slot { color: #C9A040; font-variant: small-caps; width: 5em; flex: none; }
`;

/** The gold manicule (a pointing hand), as an inline SVG. */
export const MANICULE_SVG = `<svg class="cursor" viewBox="0 0 34 22" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0B0"/><stop offset="1" stop-color="#C9952C"/></linearGradient></defs>
<rect x="1" y="4" width="6" height="14" rx="1" fill="#F4EEE0" stroke="#6A4A12" stroke-width="1"/>
<path d="M7 5 H22 Q31 6 31 9 Q31 11.5 26 11.5 H17 L18 13 Q20 15 17.5 16 Q19.5 18 16 19 H7 Z" fill="url(#mg)" stroke="#6A4A12" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M11 12.5 H16 M11 15.5 H15" stroke="#9A7428" stroke-width="1"/>
</svg>`;
