// Menus for a world of developers: a dev phone (Tab), the district map (M), a bag of
import { areaOf, areaName, cityLabel } from './areas.js';
// gadgets (I), and a first-visit controls guide drawn as line art.
// Patterns borrowed from the references Elvis shared; the look stays Builders World.

import { BUILDERS } from '../builders.js';
import { greenreyOn } from './greenrey.js';
import { loadProfile } from '../onboarding/state.js';
import { audioEngine, sfx } from './audio.js';
import { walletEngine, effortsMark, fmt } from './wallet.js';
import { passesEngine } from './passes.js';
import { roadClass, ROAD_KINDS } from './roadclass.js';
import { PAD_MAP } from './input.js';
import { LABEL } from './quality.js';
import { onlineNow } from './online.js';
import { WALLET_CSS, walletSVG, breakdown, moneySVG } from './walletui.js';
import { cardArt } from './cardart.js';
import { owns } from './shop.js';
import { RAD, GAP, C, FONT, KIT_CSS, loadFont, pattern, backdropSVG, personFor, portraitSVG, figureSVG, art, appIcon, placeArt, ribbonSVG } from './uikit.js';
import { createRadio } from './radio.js';
import { avatarPortrait } from './portraits.js';
import { DEFAULT_LOOK } from './style.js';

const CSS = `${KIT_CSS}
#lkm-dim { position: fixed; inset: 0; z-index: 30; background: rgba(34,28,20,.42); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  opacity: 0; pointer-events: none; transition: opacity .2s ease; }
#lkm-dim.on { opacity: 1; pointer-events: auto; }
.lkm-hints { position: fixed; right: 18px; bottom: 16px; z-index: 32; display: flex; gap: 8px; }
.lkm-hints span { display: inline-flex; align-items: center; gap: 8px; padding: 7px 16px 7px 7px; border-radius: 999px; background: ${C.paper}; color: ${C.ink};
  font: 700 16px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.22); }
.lkm-hints b { display: grid; place-items: center; min-width: 26px; height: 26px; padding: 0 6px; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font-size: 12px; }

/* dev phone: cream, chunky glyph apps, the hovered app's name as the title */
#lkm-phone { position: fixed; z-index: 31; left: max(4vw, 24px); top: 50%; width: 330px; height: min(600px, calc(100vh - 80px)); transform: translate(-20px, -50%) scale(.96);
  opacity: 0; pointer-events: none; transition: opacity .18s ease, transform .22s ease; border-radius: 64px; background: ${C.paper}; padding: 0;
  box-shadow: 0 6px 0 rgba(59,42,32,.22), 0 30px 80px rgba(0,0,0,.45); }
#lkm-phone.on { opacity: 1; pointer-events: auto; transform: translate(0, -50%) scale(1); }
#lkm-phone .scr { height: 100%; padding: 26px 26px 20px; box-sizing: border-box; display: flex; flex-direction: column; color: ${C.ink}; font-family: ${FONT}; }
#lkm-phone .bar { display: flex; justify-content: space-between; align-items: center; font: 700 15px/1 ${FONT}; color: #b9ab93; padding: 4px 8px 0; }
#lkm-phone .bar svg { width: 22px; height: 22px; }
#lkm-phone h2 { margin: 16px 0 16px; text-align: center; font: 800 30px/1 ${FONT}; color: ${C.ink}; }
#lkm-phone .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 12px; }
#lkm-phone .app { border: 0; background: none; padding: 0; cursor: pointer; display: grid; justify-items: center; }
#lkm-phone .app i { width: 80px; height: 80px; border-radius: 28px; display: grid; place-items: center; box-shadow: inset 0 -5px 0 rgba(59,42,32,.14); transition: transform .12s ease; }
#lkm-phone .app span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
#lkm-phone .app:hover i, #lkm-phone .app:focus-visible i { transform: translateY(-3px) scale(1.05); box-shadow: inset 0 -5px 0 rgba(59,42,32,.14), 0 0 0 4px #fff, 0 0 0 7px ${C.amber}; }
#lkm-phone .app:focus-visible { outline: none; }
/* apps that need the internet, with no Wi-Fi: faded, with a small crossed-out wave */
#lkm-phone .app.off i { filter: saturate(.25) opacity(.6); } #lkm-phone .app { position: relative; }
#lkm-phone .app .nw { position: absolute; top: -4px; right: 4px; width: 26px; height: 26px; border-radius: 50%; background: ${C.paper}; box-shadow: 0 0 0 2px #e3d4b4; display: grid; place-items: center; }
#lkm-phone .bar .net { display: inline-flex; align-items: center; gap: 4px; font: 800 12px/1 ${FONT}; } #lkm-phone .bar .net.none { color: ${C.coral}; }
/* the Wi-Fi screen */
#lkm-phone .wf { flex: 1; min-height: 0; overflow-y: auto; margin: 10px -6px 0; padding: 0 6px 6px; }
#lkm-phone .wf .back { border: 0; background: none; padding: 4px 0; color: ${C.teal}; font: 800 15px/1 ${FONT}; cursor: pointer; }
#lkm-phone .wf h3 { margin: 6px 0 4px; font: 800 26px/1 ${FONT}; } #lkm-phone .wf h4 { margin: 14px 0 6px; font: 800 12px/1 ${FONT}; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
#lkm-phone .wf .why { margin: 6px 0 0; padding: 9px 12px; border-radius: 14px; background: #fde5dc; font: 700 13.5px/1.35 ${FONT}; }
#lkm-phone .wf .now { margin-top: 8px; font: 700 14px/1.3 ${FONT}; color: ${C.ink2}; } #lkm-phone .wf .now b { color: ${C.ink}; }
#lkm-phone .wf .nw2 { display: grid; grid-template-columns: 26px 1fr auto; align-items: center; gap: 10px; padding: 9px 0; border-top: 2px dashed #e3d4b4; }
#lkm-phone .wf .nw2 b { display: block; font: 800 14.5px/1.15 ${FONT}; word-break: break-all; } #lkm-phone .wf .nw2 small { display: block; color: ${C.ink2}; font: 600 12px/1.3 ${FONT}; }
#lkm-phone .wf .nw2 button, #lkm-phone .wf .go { border: 0; border-radius: 999px; padding: 8px 13px; background: ${C.teal}; color: #fff; font: 800 13px/1 ${FONT}; cursor: pointer; }
#lkm-phone .wf .nw2 .ok { color: ${C.teal}; font: 800 13px/1 ${FONT}; }
#lkm-phone .wf form { grid-column: 1 / -1; display: flex; gap: 6px; } #lkm-phone .wf form input { flex: 1; min-width: 0; border: 2px solid #e3d4b4; border-radius: 12px; padding: 8px 10px; background: #fffaf0; color: ${C.ink}; font: 700 14px/1 ${FONT}; }
#lkm-phone .wf .err { grid-column: 1 / -1; color: #c0392b; font: 700 12.5px/1.3 ${FONT}; }
#lkm-phone .wf .near { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 14px; background: #fffaf0; border: 2px solid #ecdfc2; font: 700 13.5px/1.3 ${FONT}; }
#lkm-phone .wf ul { margin: 0; padding-left: 18px; font: 600 13px/1.45 ${FONT}; }
#lkm-phone .dots { margin-top: auto; display: flex; justify-content: center; gap: 8px; padding-top: 10px; }
#lkm-phone .dots button { width: 12px; height: 12px; padding: 0; border: 0; border-radius: 50%; background: #d9ccb2; cursor: pointer; }
#lkm-phone .dots button.on { background: #fff; box-shadow: 0 0 0 3px ${C.teal}; }
#lkm-phone .dots button:focus-visible { outline: none; box-shadow: 0 0 0 3px ${C.amber}; }

/* map: the district as an illustrated island on the lagoon */
#lkm-map { position: fixed; inset: 0; z-index: 31; display: grid; grid-template-columns: 250px 1fr 230px; gap: 18px; padding: 26px 28px 74px; box-sizing: border-box;
  opacity: 0; pointer-events: none; transition: opacity .2s ease; color: ${C.ink}; font-family: ${FONT};
  background: ${C.sea} ${pattern('roofs', 'rgba(47,128,116,.16)')}; }
#lkm-map.on { opacity: 1; pointer-events: auto; }
#lkm-map .col { position: relative; padding: 70px 16px 18px; overflow: auto; border-radius: 40px 60px 50px 40px / 50px 40px 60px 50px; background: ${C.sea2} ${pattern('waves', 'rgba(255,255,255,.16)')}; }
#lkm-map h3 { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); margin: 0; padding: 8px 26px; border-radius: 999px; background: #5bae9d; color: #fff; font: 800 22px/1 ${FONT}; white-space: nowrap; }
#lkm-map .res { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 10px; }
#lkm-map .res button, #lkm-map .places button { border: 0; cursor: pointer; font: inherit; color: inherit; background: none; padding: 0; }
#lkm-map .res button { display: grid; justify-items: center; gap: 2px; font: 700 13px/1.1 ${FONT}; color: #fff; text-shadow: 0 1px 0 rgba(0,0,0,.2); }
#lkm-map .res .hs { position: relative; width: 86px; height: 82px; display: grid; place-items: end center; clip-path: polygon(50% 0, 100% 38%, 92% 38%, 92% 100%, 8% 100%, 8% 38%, 0 38%);
  background: rgba(255,255,255,.22); transition: transform .12s ease; }
#lkm-map .res .hs svg { margin-bottom: -2px; }
#lkm-map .res button:hover .hs, #lkm-map .res button.sel .hs, #lkm-map .res button:focus-visible .hs { background: #fff; transform: scale(1.08); }
#lkm-map .res button:focus-visible { outline: none; }
#lkm-map .res .live { position: absolute; top: 30px; right: 14px; width: 12px; height: 12px; border-radius: 50%; background: #5fe08d; box-shadow: 0 0 0 2.5px #fff; }
#lkm-map .mid { position: relative; display: grid; place-items: center; min-height: 0; }
#lkm-map .ribbon { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); z-index: 2; width: 380px; height: 84px; display: grid; place-items: center; }
#lkm-map .ribbon svg { position: absolute; inset: 0; width: 100%; height: 100%; }
#lkm-map .ribbon b { position: relative; margin-top: -10px; font: 800 34px/1 ${FONT}; color: ${C.ink}; text-align: center; }
#lkm-map .ribbon small { display: block; font: 700 12px/1.3 ${FONT}; letter-spacing: .16em; text-transform: uppercase; color: #7a5410; }
#lkm-map canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; border-radius: 40px 60px 50px 40px / 50px 40px 60px 50px; box-shadow: inset 0 0 0 3px rgba(255,255,255,.4); }
#lkm-map .mid { border-radius: 40px 60px 50px 40px / 50px 40px 60px 50px; box-shadow: 0 0 0 3px rgba(255,255,255,.35), 0 10px 30px rgba(20,60,55,.18); }
#lkm-map .bubble { position: absolute; pointer-events: auto; text-align: center; transform: translate(-50%, calc(-100% - 22px)); background: #f2ead6; color: ${C.ink}; padding: 10px 22px; border-radius: 28px;
  font: 800 22px/1.1 ${FONT}; white-space: nowrap; display: none; box-shadow: 0 4px 0 rgba(59,42,32,.15); }
#lkm-map .bubble::after { content: ''; position: absolute; left: 50%; bottom: -10px; width: 18px; height: 18px; background: #f2ead6; transform: translateX(-50%) rotate(45deg); border-radius: 3px; }
#lkm-map .bubble b { display: block; font: 800 16px/1.2 ${FONT}; }
#lkm-map .bubble small { display: block; margin-top: 2px; font: 700 12.5px/1.2 ${FONT}; color: ${C.ink2}; }
#lkm-map .bubble button { margin-top: 8px; padding: 7px 14px; border: 0; border-radius: 999px; background: ${C.teal}; color: #fff; font: 800 13px/1 ${FONT}; cursor: pointer; }
#lkm-map .bubble button:focus-visible { outline: 3px solid ${C.amber}; outline-offset: 2px; }
#lkm-map .rhead { margin: -6px 2px 10px; color: #fff; font: 700 13px/1.3 ${FONT}; text-align: center; text-shadow: 0 1px 0 rgba(0,0,0,.15); }
#lkm-map .rhead b { font-weight: 800; } #lkm-map .rhead .on { display: inline-flex; align-items: center; gap: 5px; } #lkm-map .rhead .on::before { content: ''; width: 9px; height: 9px; border-radius: 50%; background: #5fe08d; box-shadow: 0 0 0 2px #fff; }
#lkm-map .rsearch { width: 100%; box-sizing: border-box; margin: 0 0 12px; padding: 9px 14px; border: 0; border-radius: 999px; background: ${C.paper}; color: ${C.ink}; font: 700 14px/1 ${FONT}; box-shadow: inset 0 0 0 2px rgba(59,42,32,.1); }
#lkm-map .rsearch:focus-visible { outline: 3px solid ${C.amber}; }
#lkm-map .res .hs img { width: 78px; height: 78px; object-fit: cover; margin-bottom: -2px; }
#lkm-map .rall { display: block; margin: 12px auto 0; padding: 7px 14px; border: 0; border-radius: 999px; background: ${C.paper}; color: ${C.ink}; font: 800 13px/1 ${FONT}; cursor: pointer; }
#lkm-map .places { display: grid; gap: 4px; }
#lkm-map .places button { display: grid; justify-items: center; transition: transform .12s ease; }
#lkm-map .onl { display: grid; gap: 6px; margin-bottom: 14px; }
#lkm-map .onl .o { display: flex; align-items: center; gap: 6px; padding: 6px 6px 6px 10px; border-radius: 16px; background: #fffaf0; border: 2px solid #e3d4b4; }
#lkm-map .onl button { border: 0; background: none; color: inherit; font: inherit; cursor: pointer; padding: 0; }
#lkm-map .onl [data-o] { flex: 1; display: flex; align-items: center; gap: 8px; text-align: left; font: 700 14px/1.2 ${FONT}; }
#lkm-map .onl [data-o] i { flex: none; width: 12px; height: 12px; border-radius: 50%; background: #3fbf6d; box-shadow: 0 0 0 3px rgba(63,191,109,.25); }
#lkm-map .onl small { display: block; font: 700 11.5px/1.2 ${FONT}; color: ${C.ink2}; }
#lkm-map .onl .j { flex: none; padding: 6px 12px !important; border-radius: 999px; background: ${C.ink} !important; color: ${C.paper} !important; font: 700 13px/1 ${FONT} !important; }
#lkm-map .places button span { margin-top: -10px; padding: 4px 12px; border-radius: 999px; background: ${C.paper}; font: 700 13px/1.15 ${FONT}; text-align: center; box-shadow: 0 3px 0 rgba(59,42,32,.15); }
#lkm-map .places button small { display: block; color: ${C.ink2}; font-size: 11.5px; font-weight: 600; }
#lkm-map .places button:hover, #lkm-map .places button.sel, #lkm-map .places button:focus-visible { transform: translateY(-3px) scale(1.04); outline: none; }
#lkm-map .places button.sel span { background: ${C.amber}; }
#lkm-map .zoom { position: absolute; right: 10px; bottom: 60px; display: grid; gap: 6px; }
#lkm-map .zoom button { width: 40px; height: 40px; border: 0; border-radius: 50%; background: ${C.paper}; color: ${C.ink}; font: 800 20px/1 ${FONT}; cursor: pointer; box-shadow: 0 3px 0 rgba(59,42,32,.2); }
#lkm-map .legend { position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%); display: flex; gap: 10px; padding: 6px 12px; border-radius: 999px; background: ${C.paper}; font: 700 12px/1 ${FONT}; box-shadow: 0 3px 0 rgba(59,42,32,.15); white-space: nowrap; }
#lkm-map .legend { flex-direction: column; align-items: center; gap: 5px; } #lkm-map .legend .lg { display: flex; gap: 10px; }
#lkm-map .legend small { color: ${C.ink2}; font: 700 11px/1 ${FONT}; margin-left: 2px; }
#lkm-map .legend i { display: inline-block; width: 12px; height: 12px; border-radius: 4px; margin-right: 5px; vertical-align: -1px; }
#lkm-map canvas { touch-action: none; }
#lkm-map .kinds { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
#lkm-map .kinds button { display: flex; align-items: center; gap: 6px; padding: 5px 8px 5px 5px; border-radius: 999px; background: ${C.paper}; font: 700 12px/1.1 ${FONT}; text-align: left; box-shadow: 0 2px 0 rgba(59,42,32,.15); }
#lkm-map .kinds button.sel { background: #fff; box-shadow: inset 0 0 0 3px ${C.teal}; }
#lkm-map .kinds i { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: none; }
#lkm-map .kinds i svg { width: 20px; height: 20px; }
#lkm-map .kinds small { display: block; font-size: 10.5px; color: ${C.ink2}; }
/* the UI brief: a rectangular map and its sidebars on one small set of radii (uikit RAD), aligned, nothing clipped */
#lkm-map .mid, #lkm-map canvas { border-radius: ${RAD.lg}px; }
#lkm-map .mid { background: ${C.paper2}; box-shadow: none; overflow: hidden; }
#lkm-map canvas { box-shadow: none; }
#lkm-map .col { border-radius: ${RAD.lg}px; padding: 64px ${GAP.md}px ${GAP.lg}px; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
#lkm-map .col::after { content: ''; display: block; height: ${GAP.lg}px; } /* room under the last row, so it scrolls clear */
#lkm-map h3 { top: ${GAP.md}px; border-radius: ${RAD.md}px; padding: 8px 20px; font-size: 19px; }
#lkm-map .col > h3[style] { display: block !important; margin: ${GAP.lg}px 0 ${GAP.sm}px !important; padding: 0 2px; background: none; color: #fff; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(0,0,0,.15); }
#lkm-map .places { gap: ${GAP.sm}px; }
#lkm-map .places button span { border-radius: ${RAD.md}px; box-shadow: none; padding: 5px 10px; }
#lkm-map .kinds { gap: ${GAP.sm}px; }
#lkm-map .kinds button { border-radius: ${RAD.md}px; box-shadow: none; padding: 6px 8px 6px 6px; min-height: 40px; }
#lkm-map .kinds i { border-radius: ${RAD.sm}px; }
#lkm-map .rsearch, #lkm-map .onl .o, #lkm-map .rall { border-radius: ${RAD.md}px; }
#lkm-map .legend { border-radius: ${RAD.md}px; box-shadow: none; }
#lkm-map .zoom button { border-radius: ${RAD.md}px; box-shadow: none; }
#lkm-map .hint { color: rgba(255,255,255,.92); font: 600 12.5px/1.4 ${FONT}; margin: ${GAP.md}px 2px 0; }
#lkm-map .hint { margin: 12px 6px 0; color: #fff; font: 600 12.5px/1.45 ${FONT}; text-shadow: 0 1px 0 rgba(0,0,0,.15); }

/* bag: you in the middle, what you carry in a ring around you (the wardrobe screen) */
#lkm-bag { position: fixed; inset: 0; z-index: 31; opacity: 0; pointer-events: none; transition: opacity .2s ease; font-family: ${FONT}; color: ${C.ink};
  background: ${C.indigo} center / cover no-repeat; overflow: hidden; }
#lkm-bag.on { opacity: 1; pointer-events: auto; }
#lkm-bag .tabs { position: absolute; top: 24px; left: 28px; display: flex; gap: 8px; z-index: 3; }
#lkm-bag .tabs button { border: 0; border-radius: 999px; padding: 9px 18px; background: rgba(255,255,255,.14); color: #fff; font: 700 15px/1 ${FONT}; cursor: pointer; }
#lkm-bag .tabs button.on { background: ${C.paper}; color: ${C.ink}; box-shadow: 0 3px 0 rgba(0,0,0,.2); }
#lkm-bag .stage { position: absolute; left: 50%; top: 52%; width: 760px; height: 640px; transform: translate(-50%, -50%) scale(var(--k, 1)); }
#lkm-bag .disc { position: absolute; left: 50%; top: 50%; width: 360px; height: 420px; transform: translate(-50%, -50%); border-radius: 46% 54% 50% 50% / 52% 48% 52% 48%;
  background: #2c4489 ${pattern('roofs', 'rgba(108,140,220,.28)')}; }
#lkm-bag .fig { position: absolute; left: 50%; top: 50%; width: 230px; transform: translate(-50%, -52%); }
#lkm-bag .it { position: absolute; width: 132px; height: 132px; transform: translate(-50%, -50%); border: 0; padding: 0; background: none; cursor: pointer; display: grid; place-items: center; transition: transform .14s ease; }
#lkm-bag .it .fl { position: absolute; inset: 0; }
#lkm-bag .it .fl path { fill: rgba(255,255,255,.2); stroke: rgba(255,255,255,.28); stroke-width: 2; }
#lkm-bag .it svg.a { position: relative; filter: drop-shadow(0 3px 0 rgba(0,0,0,.18)); }
#lkm-bag .it:hover, #lkm-bag .it:focus-visible { transform: translate(-50%, -50%) scale(1.07); outline: none; }
#lkm-bag .it.sel .fl path { fill: ${C.paper}; stroke: ${C.amber}; stroke-width: 5; }
#lkm-bag .it.locked svg.a { filter: grayscale(1) opacity(.5); }
/* more than four in a tab: a carousel, four at a time round you; arrows, dots, the arrow keys, a swipe or the wheel turn it */
#lkm-bag .it.pg { animation: lkbIn .32s cubic-bezier(.2,1.2,.35,1) backwards; animation-delay: calc(var(--k) * 40ms); }
@keyframes lkbIn { from { opacity: 0; transform: translate(calc(-50% + var(--dx, 0px)), -50%) scale(.8); } }
#lkm-bag .pgb { position: absolute; top: 50%; width: 54px; height: 54px; margin-top: -27px; border: 0; border-radius: 50%; background: ${C.paper}; color: ${C.ink}; box-shadow: 0 4px 0 rgba(0,0,0,.22); cursor: pointer; display: grid; place-items: center; z-index: 2; transform: scale(calc(1 / var(--k, 1))); } /* full size to tap, however small the ring is drawn */
#lkm-bag .pgb:hover, #lkm-bag .pgb:focus-visible { background: #fff; outline: 3px solid ${C.amber}; outline-offset: 2px; }
#lkm-bag .pgb:disabled { opacity: .35; cursor: default; outline: none; }
#lkm-bag .pgb.l { left: 24px; } #lkm-bag .pgb.r { right: 24px; }
#lkm-bag .pgd { position: absolute; left: 50%; bottom: -6px; transform: translateX(-50%) scale(calc(1 / var(--k, 1))); transform-origin: 50% 100%; display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 999px; background: rgba(0,0,0,.22); z-index: 2; }
#lkm-bag .pgd button { width: 10px; height: 10px; padding: 0; border: 0; border-radius: 50%; background: rgba(255,255,255,.45); cursor: pointer; }
#lkm-bag .pgd button.on { width: 26px; border-radius: 5px; background: ${C.paper}; }
#lkm-bag .pgd span { margin-left: 4px; color: #fff; font: 700 12.5px/1 ${FONT}; }
@media (prefers-reduced-motion: reduce) { #lkm-bag .it.pg { animation: none; } }
#lkm-bag .it .eq { position: absolute; top: 14px; right: 18px; width: 22px; height: 22px; border-radius: 50%; background: #5fe08d; box-shadow: 0 0 0 3px #fff; display: grid; place-items: center; color: #10331c; font: 800 13px/1 ${FONT}; }
#lkm-bag .name { position: absolute; left: 50%; top: 18px; transform: translateX(-50%); z-index: 3; padding: 12px 34px; border-radius: 999px; background: ${C.teal}; color: #fff;
  font: 800 28px/1 ${FONT}; white-space: nowrap; box-shadow: 0 5px 0 rgba(0,0,0,.2); }
#lkm-bag .name::after { content: ''; position: absolute; left: 50%; bottom: -9px; width: 18px; height: 18px; background: ${C.teal}; transform: translateX(-50%) rotate(45deg); border-radius: 3px; }
#lkm-bag .card { position: absolute; left: 28px; bottom: 24px; width: min(330px, calc(100vw - 56px)); padding: 16px 18px; z-index: 3; }
#lkm-bag .card .tag { display: inline-block; font: 700 11.5px/1 ${FONT}; padding: 5px 10px; border-radius: 999px; background: ${C.paper2}; color: ${C.ink2}; margin-bottom: 8px; }
#lkm-bag .card p { margin: 0; font: 600 14.5px/1.45 ${FONT}; }
#lkm-bag .acts { position: absolute; right: 18px; bottom: 16px; display: flex; gap: 8px; z-index: 3; }
#lkm-bag .cardsview { position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%); width: min(820px, calc(100vw - 40px)); max-height: calc(100vh - 210px); overflow-y: auto; padding: 8px;
  display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(280px, 380px)); justify-content: center; align-items: start; }
#lkm-bag .wifis { padding: 14px 16px; } #lkm-bag .wifis h4 { margin: 0 0 8px; font: 800 15px/1 ${FONT}; } #lkm-bag .wifis .w { padding: 6px 0; border-top: 2px dashed #e3d4b4; font: 700 14px/1.2 ui-monospace, Menlo, monospace; } #lkm-bag .wifis p { margin: 0; font: 600 13.5px/1.4 ${FONT}; color: ${C.ink2}; }
/* the cards page: a card holder you open into a carousel, reputation and Wi-Fi beside it */
#lkm-bag .cw { position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%); width: min(1080px, calc(100vw - 40px)); display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 28px; align-items: center; }
#lkm-bag .cw-main { position: relative; min-width: 0; }
#lkm-bag .cw-stage { position: relative; height: 380px; }
#lkm-bag .holder { position: absolute; left: 50%; top: 50%; width: 320px; height: 260px; border: 0; padding: 0; background: none; cursor: pointer; transform: translate(-50%, -46%); transition: transform .55s cubic-bezier(.2,1.2,.3,1), opacity .3s; z-index: 2; }
#lkm-bag .holder:focus-visible { outline: 3px solid ${C.amber}; outline-offset: 6px; border-radius: 28px; }
#lkm-bag .holder .peek { position: absolute; left: 50%; top: 0; width: 260px; transform: translateX(-50%) translateY(calc(var(--i) * 13px)) rotate(calc((var(--i) - 2) * 2.5deg)); transition: transform .35s cubic-bezier(.2,1.4,.4,1); pointer-events: none; }
#lkm-bag .holder:hover .peek { transform: translateX(-50%) translateY(calc(var(--i) * 13px - 14px)) rotate(calc((var(--i) - 2) * 3.5deg)); }
#lkm-bag .holder .peek .bw-card { box-shadow: 0 2px 0 rgba(0,0,0,.18); }
#lkm-bag .holder .sleeve { position: absolute; left: 0; right: 0; bottom: 0; height: 170px; filter: drop-shadow(0 8px 0 rgba(0,0,0,.22)); }
#lkm-bag .holder .count { position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%); padding: 5px 12px; border-radius: 999px; background: rgba(0,0,0,.25); color: #f7efdc; font: 800 13px/1 ${FONT}; white-space: nowrap; }
#lkm-bag .track { position: absolute; inset: 0; display: flex; align-items: center; gap: 22px; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 0 calc(50% - var(--cw) / 2); --cw: min(380px, 76vw); opacity: 0; pointer-events: none; z-index: 3;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent); mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent); }
#lkm-bag .track::-webkit-scrollbar { display: none; }
#lkm-bag .slot { flex: none; width: var(--cw); scroll-snap-align: center; transition: transform .35s cubic-bezier(.2,1.2,.3,1), filter .3s; transform: scale(.86); filter: saturate(.75) brightness(.92); }
#lkm-bag .slot.on { transform: scale(1); filter: none; }
#lkm-bag .slot .bw-card { max-width: none; }
#lkm-bag .cw.open .track { opacity: 1; pointer-events: auto; }
#lkm-bag .cw.open .slot { animation: lkcFly .6s cubic-bezier(.2,1.25,.35,1) both; animation-delay: calc(var(--i) * 70ms); }
@keyframes lkcFly { from { transform: translateY(150px) scale(.5) rotate(-8deg); opacity: 0; } 60% { opacity: 1; } }
#lkm-bag .cw.open .holder { transform: translate(-50%, 70%) scale(.42); opacity: .9; }
#lkm-bag .cw-nav { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 4px; opacity: 0; transition: opacity .3s; pointer-events: none; }
#lkm-bag .cw.open .cw-nav { opacity: 1; pointer-events: auto; }
#lkm-bag .cw-nav button { width: 40px; height: 40px; border: 0; border-radius: 50%; background: ${C.paper}; color: ${C.ink}; font: 800 22px/1 ${FONT}; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,.2); }
#lkm-bag .cw-nav .dots { display: flex; gap: 6px; } #lkm-bag .cw-nav .dots i { width: 8px; height: 8px; border-radius: 999px; background: rgba(247,239,220,.35); transition: width .25s, background .25s; }
#lkm-bag .cw-nav .dots i.on { width: 22px; background: ${C.paper}; }
#lkm-bag .cw-hint { text-align: center; margin: 8px 0 0; color: rgba(247,239,220,.85); font: 700 13.5px/1.3 ${FONT}; }
#lkm-bag .cw-side { display: grid; gap: 14px; align-self: center; }
#lkm-bag .cw-side .bw-paper { padding: 16px 18px; border-radius: 22px; }
#lkm-bag .cw-side h4 { margin: 0 0 10px; font: 800 16px/1 ${FONT}; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
#lkm-bag .cw-side h4 small { font: 700 12px/1 ${FONT}; color: ${C.ink2}; }
#lkm-bag .rep { display: grid; grid-template-columns: 84px 1fr; gap: 14px; align-items: center; }
#lkm-bag .rep svg { width: 84px; height: 84px; } #lkm-bag .rep b { display: block; font: 800 16px/1.15 ${FONT}; } #lkm-bag .rep p { margin: 4px 0 0; font: 600 12.5px/1.4 ${FONT}; color: ${C.ink2}; }
#lkm-bag .rep ul { grid-column: 1 / -1; margin: 2px 0 0; padding: 0; list-style: none; display: grid; gap: 5px; font: 700 12.5px/1.3 ${FONT}; }
#lkm-bag .rep li { display: flex; gap: 8px; align-items: center; } #lkm-bag .rep li i { flex: none; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font: 800 13px/1 ${FONT}; font-style: normal; }
#lkm-bag .rep li i.up { background: #d8f0dd; color: #1f7a3a; } #lkm-bag .rep li i.dn { background: #f7dcd5; color: #a8302a; }
#lkm-bag .net { display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center; padding: 9px 0; border-top: 2px dashed #e3d4b4; }
#lkm-bag .net:first-of-type { border-top: 0; } #lkm-bag .net svg { width: 24px; height: 20px; }
#lkm-bag .net b { display: block; font: 800 14px/1.2 ui-monospace, Menlo, monospace; } #lkm-bag .net small { font: 700 11.5px/1.2 ${FONT}; color: ${C.ink2}; }
#lkm-bag .net button { border: 0; border-radius: 999px; padding: 5px 10px; background: ${C.paper2}; color: ${C.ink}; font: 700 12px/1 ${FONT}; cursor: pointer; }
#lkm-bag .cw-side .empty { margin: 0; font: 600 13px/1.4 ${FONT}; color: ${C.ink2}; }
@media (max-width: 860px) {
  body #lkm-bag .name { top: 92px; padding: 9px 24px; font-size: 22px; } /* below the tabs, which wrap to two rows on a phone */
  #lkm-bag .cw { top: 150px; transform: translateX(-50%); grid-template-columns: 1fr; gap: 14px; max-height: calc(100vh - 220px); overflow-y: auto; overflow-x: hidden; padding-bottom: 12px; }
  #lkm-bag .cw-stage { height: 300px; } #lkm-bag .holder { width: 260px; height: 220px; } #lkm-bag .holder .peek { width: 210px; } #lkm-bag .holder .sleeve { height: 140px; }
  #lkm-bag .cw.open .cw-main { padding-bottom: 120px; } #lkm-bag .cw.open .holder { transform: translate(-50%, 96%) scale(.36); }
  #lkm-bag .track { -webkit-mask-image: none; mask-image: none; }
}
@media (prefers-reduced-motion: reduce) { #lkm-bag .cw.open .slot { animation: none; } #lkm-bag .holder, #lkm-bag .slot { transition: none; } }
#lkm-bag .acts button { border: 0; cursor: pointer; }
#lkm-bag .acts button[disabled] { opacity: .55; cursor: default; }
/* wallet and ATM */
#lkm-wal { position: fixed; z-index: 31; left: 50%; top: 50%; width: min(400px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow: auto; padding: 22px 22px 18px; box-sizing: border-box;
  transform: translate(-50%, -48%); opacity: 0; pointer-events: none; transition: opacity .18s ease, transform .2s ease; }
#lkm-wal.on { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%); }
#lkm-wal.atm { border: 12px solid #2a9d94; }
#lkm-wal h3 { margin: 0 0 10px; font: 800 26px/1 ${FONT}; }
#lkm-wal h3 small { display: block; margin-top: 4px; font: 600 13px/1 ${FONT}; color: ${C.ink2}; }
#lkm-wal .bal { display: flex; align-items: center; gap: 6px; padding: 14px 16px; border-radius: 18px; background: #2a9d94; color: #fff; }
#lkm-wal li b.in { color: #2f8a4f; }
#lkm-wal .bal b { font: 800 40px/1 ${FONT}; letter-spacing: -.01em; }
#lkm-wal .how, #lkm-wal .st { margin: 10px 0; font: 600 13.5px/1.45 ${FONT}; color: ${C.ink2}; }
#lkm-wal .st { color: ${C.coral}; }
#lkm-wal .gh { display: flex; gap: 8px; }
#lkm-wal .gh input { flex: 1; min-width: 0; border: 2px solid #e3d4b4; border-radius: 999px; padding: 8px 14px; background: #fffaf0; color: ${C.ink}; font: 700 14px/1 ${FONT}; }
#lkm-wal .gh button { border: 0; cursor: pointer; }
#lkm-wal h4 { margin: 14px 0 6px; font: 800 15px/1 ${FONT}; color: ${C.teal}; }
#lkm-wal ul { list-style: none; margin: 0 0 14px; padding: 0; }
#lkm-wal li { display: flex; justify-content: space-between; padding: 6px 0; border-top: 2px dashed #e3d4b4; font: 600 14px/1.3 ${FONT}; }
#lkm-wal li.none { color: ${C.ink2}; }
#lkm-wal .done { border: 0; cursor: pointer; float: right; }
/* settings */
#lkm-set { position: fixed; z-index: 31; left: 50%; top: 50%; width: min(420px, calc(100vw - 32px)); padding: 22px 22px 18px; box-sizing: border-box; transform: translate(-50%, -48%);
  opacity: 0; pointer-events: none; transition: opacity .18s ease, transform .2s ease; }
#lkm-set.on { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%); }
#lkm-set h3 { margin: 0 0 12px; font: 800 28px/1 ${FONT}; }
#lkm-set .sw { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-top: 2px dashed #e3d4b4; cursor: pointer; }
#lkm-set .sw span { flex: 1; } #lkm-set b { display: block; font: 800 17px/1.2 ${FONT}; }
#lkm-set small { display: block; color: ${C.ink2}; font: 600 13px/1.35 ${FONT}; }
#lkm-set .sw input { position: absolute; opacity: 0; }
#lkm-set .sw i { width: 52px; height: 30px; border-radius: 999px; background: #d9ccb2; position: relative; flex: none; transition: background .15s; box-shadow: inset 0 2px 0 rgba(59,42,32,.12); }
#lkm-set .sw i::after { content: ''; position: absolute; left: 3px; top: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 2px 0 rgba(59,42,32,.2); transition: transform .15s; }
#lkm-set .sw input:checked + i { background: ${C.teal}; }
#lkm-set .sw input:checked + i::after { transform: translateX(22px); }
#lkm-set .sw input:focus-visible + i { outline: 3px solid ${C.amber}; outline-offset: 2px; }
#lkm-set .vol { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-top: 2px dashed #e3d4b4; }
#lkm-set .vol input { flex: 1; accent-color: ${C.teal}; }
#lkm-set .note { margin: 6px 0 14px; color: ${C.ink2}; font: 600 12.5px/1.4 ${FONT}; }
#lkm-set .done { border: 0; cursor: pointer; float: right; }
#lkm-set { max-height: calc(100vh - 40px); overflow: auto; }
#lkm-set h4.sec { margin: 14px 0 4px; font: 800 18px/1 ${FONT}; color: ${C.teal}; }
#lkm-set select { border: 2px solid #e3d4b4; border-radius: 999px; padding: 6px 12px; background: #fffaf0; color: ${C.ink}; font: 700 14px/1 ${FONT}; }
/* Settings, redesigned (the UI brief's design system): a list of sections on the left, one section at a time, its
   settings grouped in cards; every control and handler is the same as before (restyleSettings) */
#lkm-set.v2 { width: min(760px, calc(100vw - 32px)); height: min(620px, calc(100vh - 40px)); padding: 0; overflow: hidden; display: grid; grid-template-columns: 190px 1fr; grid-template-rows: auto 1fr; border-radius: ${RAD.lg}px; }
#lkm-set.v2 > header { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; padding: ${GAP.lg}px ${GAP.lg + 4}px ${GAP.md}px; border-bottom: 1px solid rgba(59,42,32,.1); }
#lkm-set.v2 > header h3 { margin: 0; font-size: 24px; }
#lkm-set.v2 > header .xs { border: 0; width: 34px; height: 34px; border-radius: ${RAD.sm}px; background: ${C.paper2}; color: ${C.ink}; font: 800 15px/1 ${FONT}; cursor: pointer; }
#lkm-set.v2 > nav { display: flex; flex-direction: column; gap: ${GAP.xs}px; padding: ${GAP.md}px; border-right: 1px solid rgba(59,42,32,.1); overflow-y: auto; }
#lkm-set.v2 > nav button { display: flex; align-items: center; gap: ${GAP.sm}px; padding: 10px 12px; border: 0; border-radius: ${RAD.md}px; background: none; color: ${C.ink}; font: 800 15px/1 ${FONT}; text-align: left; cursor: pointer; }
#lkm-set.v2 > nav button:hover { background: rgba(59,42,32,.05); } #lkm-set.v2 > nav button.on { background: ${C.ink}; color: ${C.paper}; }
#lkm-set.v2 > .pane { overflow-y: auto; padding: ${GAP.md}px ${GAP.lg + 4}px ${GAP.lg}px; }
#lkm-set.v2 section { display: none; } #lkm-set.v2 section.on { display: block; }
#lkm-set.v2 section > h4.sec { margin: ${GAP.sm}px 0 ${GAP.md}px; font: 800 13px/1 ${FONT}; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
#lkm-set.v2 .grp { margin: 0 0 ${GAP.md}px; padding: 0 ${GAP.md}px; border-radius: ${RAD.md}px; background: ${C.paper2}; }
#lkm-set.v2 .grp .sw, #lkm-set.v2 .grp .vol { border-top: 1px solid rgba(59,42,32,.1); padding: ${GAP.md}px 0; }
#lkm-set.v2 .grp > :first-child { border-top: 0; }
#lkm-set.v2 b { font-size: 15px; } #lkm-set.v2 small { font-size: 12.5px; }
#lkm-set.v2 .note { margin: -${GAP.xs}px 2px ${GAP.md}px; }
#lkm-set.v2 .seg { display: flex; flex-wrap: wrap; gap: ${GAP.xs}px; padding: ${GAP.xs}px; border-radius: ${RAD.md}px; background: rgba(59,42,32,.08); }
#lkm-set.v2 .seg button { flex: 1 0 auto; min-width: 64px; white-space: nowrap; padding: 8px 10px; border: 0; border-radius: ${RAD.sm}px; background: none; color: ${C.ink}; font: 800 13px/1.1 ${FONT}; cursor: pointer; }
#lkm-set.v2 .seg button.on { background: #fffaf0; box-shadow: 0 1px 0 rgba(59,42,32,.12); }
#lkm-set.v2 .vol input[type=text] { flex: 1; min-width: 0; padding: 8px 10px; border: 2px solid #e3d4b4; border-radius: ${RAD.sm}px; background: #fffaf0; color: ${C.ink}; font: 700 14px/1.2 ${FONT}; accent-color: ${C.teal}; }
#lkm-set.v2 .vol input[type=text]::placeholder { color: #a8957f; }
#lkm-set.v2 .vol input[type=text]:focus-visible { outline: 3px solid ${C.amber}; outline-offset: 1px; }
#lkm-set.v2 .done { display: none; }
@media (max-width: 700px) { #lkm-set.v2 { grid-template-columns: 1fr; grid-template-rows: auto auto 1fr; } #lkm-set.v2 > nav { flex-direction: row; overflow-x: auto; border-right: 0; border-bottom: 1px solid rgba(59,42,32,.1); } #lkm-set.v2 > nav button { flex: none; } }
#lkm-set table.pad { width: 100%; border-collapse: collapse; margin-bottom: 14px; font: 600 13.5px/1.3 ${FONT}; }
#lkm-set table.pad td { padding: 5px 0; border-top: 2px dashed #e3d4b4; }
#lkm-set table.pad td:first-child { width: 96px; }
#lkm-set table.pad kbd { display: inline-block; min-width: 26px; padding: 3px 8px; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font: 700 12px/1.2 ${FONT}; text-align: center; }
/* first-visit guide, line art over the darkened street */
#lkm-guide { position: fixed; inset: 0; z-index: 33; display: grid; place-items: center; background: radial-gradient(ellipse at center, rgba(5,8,18,.55), rgba(5,8,18,.85));
  color: #fff; opacity: 0; pointer-events: none; transition: opacity .5s ease; font: 800 15px/1 "Avenir Next", system-ui, sans-serif; letter-spacing: .12em; }
#lkm-guide.on { opacity: 1; pointer-events: auto; }
#lkm-guide .row { display: flex; align-items: flex-end; gap: clamp(28px, 6vw, 80px); flex-wrap: wrap; justify-content: center; padding: 0 24px; }
#lkm-guide .g { display: grid; justify-items: center; gap: 16px; }
#lkm-guide .keys { display: grid; grid-template-columns: repeat(3, 54px); gap: 8px; }
#lkm-guide kbd { display: grid; place-items: center; height: 54px; min-width: 54px; padding: 0 10px; box-sizing: border-box; border: 2.5px solid #fff; border-radius: 12px;
  font: 800 18px/1 "Avenir Next", system-ui, sans-serif; letter-spacing: 0; }
#lkm-guide svg { stroke: #fff; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
#lkm-guide .or { opacity: .8; margin: 0 4px 20px; }
#lkm-guide .skip { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); font: 600 12px/1 system-ui; letter-spacing: .08em; opacity: .65; }
#lkm-tip { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 14; display: flex; gap: 6px; pointer-events: none; padding: 5px; border-radius: 999px;
  background: rgba(247,239,220,.88); box-shadow: 0 3px 0 rgba(59,42,32,.15); font: 700 12.5px/1 ${FONT}; color: ${C.ink2}; }
body.nohud #lkm-tip { display: none; }
#lkm-tip span { display: inline-flex; align-items: center; padding-right: 8px; }
#lkm-tip b { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; margin-right: 5px; border-radius: 999px; background: ${C.ink}; color: ${C.paper}; font-size: 11px; }
@media (max-width: 700px) {
  #lkm-map { grid-template-columns: 1fr; grid-template-rows: auto auto auto; padding: 70px 12px 70px; overflow: auto; align-content: start; }
  #lkm-map .mid { order: -1; }
  #lkm-map .ribbon { top: -62px; width: 280px; height: 66px; } #lkm-map .ribbon b { font-size: 26px; }
  #lkm-map canvas { width: 100%; } #lkm-map .mid { height: min(100vw, 64vh); }
  #lkm-map .col { padding-top: 62px; }
  #lkm-map .res { grid-template-columns: repeat(4, 1fr); }
  #lkm-map .res .hs { width: 70px; height: 68px; }
  #lkm-map .places { grid-template-columns: repeat(2, 1fr); }
  #lkm-bag .name { font-size: 20px; top: 64px; padding: 9px 22px; }
  #lkm-bag .tabs { left: 12px; right: 12px; top: 14px; flex-wrap: wrap; }
  #lkm-bag .card { left: 12px; bottom: 64px; width: calc(100vw - 24px); box-sizing: border-box; padding: 12px 14px; }
  #lkm-phone { left: 50%; width: min(340px, calc(100vw - 32px)); transform: translate(-50%, -50%) scale(.96); }
  #lkm-phone.on { transform: translate(-50%, -50%) scale(1); }
  #lkm-tip { display: none; }
}
@media (prefers-reduced-motion: reduce) { #lkm-dim, #lkm-phone, #lkm-map, #lkm-bag, #lkm-guide { transition: none; } }
`;

// ---------- what a developer carries ----------
export const ITEMS = [
  { id: 'laptop', tab: 'gadgets', icon: 'laptop', name: 'Laptop', desc: 'Your main machine. Later, linking it to your presence agent will show you working at a bench when you are really coding.', tag: 'Gadget' },
  { id: 'phone', tab: 'gadgets', icon: 'phone', name: 'Phone', desc: 'This phone. Tab opens it anywhere in the world.', tag: 'Gadget', always: true },
  { id: 'tablet', tab: 'gadgets', icon: 'tablet', name: 'Tablet', desc: 'For sketching flows and reading docs on the danfo.', tag: 'Gadget' },
  { id: 'keyboard', tab: 'gadgets', icon: 'keyboard', name: 'Mechanical keyboard', desc: 'Loud, proud, and on every desk in the Creative Hub.', tag: 'Gadget' },
  { id: 'powerbank', tab: 'gadgets', icon: 'powerbank', name: 'Power bank', desc: 'For when the power goes in the middle of a deploy.', tag: 'Gadget' },
  { id: 'router', tab: 'gadgets', icon: 'router', name: 'MiFi router', desc: 'Your own data when the cafe wifi gives up.', tag: 'Gadget' },
  { id: 'skateboard', tab: 'gadgets', icon: 'skateboard', name: 'Skateboard', desc: 'Carry it and you roll instead of walk. Shift for speed. The skate park is waiting.', tag: 'Gadget' },
  { id: 'skates', tab: 'gadgets', icon: 'skates', name: 'Roller skates', desc: 'Put them on and glide. Round the pond is the best loop in Yaba.', tag: 'Gadget' },
  // from the gadget shop (shop.js): each has a price and must be bought before it can be carried or worn
  { id: 'bicycle', tab: 'gadgets', icon: 'bicycle', name: 'Your own bicycle', desc: 'Yours, not rented: carry it and you ride, anywhere, any time. Put it back to walk.', tag: 'Gadget', price: 9000 },
  { id: 'hoverboard', tab: 'gadgets', icon: 'hoverboard', name: 'Hoverboard', desc: 'Self-balancing: stand on it and lean where you want to go. Shift to go faster.', tag: 'Gadget', price: 6500 },
  { id: 'scooter', tab: 'gadgets', icon: 'scooter', name: 'Electric scooter', desc: 'Quicker than a board, quieter than a keke. Carry it and you ride. Shift for full speed.', tag: 'Gadget', price: 7500 },
  { id: 'binoculars', tab: 'gadgets', icon: 'binoculars', name: 'Binoculars', desc: 'Carry them and hold Z to look far down the street.', tag: 'Gadget', price: 1500 },
  { id: 'notebook', tab: 'gadgets', icon: 'notebook', name: 'Notebook', desc: 'Paper still wins for system diagrams.', tag: 'Gadget' },
  { id: 'headphones', tab: 'wear', icon: 'headphones', name: 'Headphones', desc: 'Deep work mode. Shows on your avatar.', tag: 'Wearable', wear: true },
  { id: 'backpack', tab: 'wear', icon: 'backpack', name: 'Laptop backpack', desc: 'Carries the whole setup. Shows on your avatar.', tag: 'Wearable', wear: true },
  { id: 'cap', tab: 'wear', icon: 'cap', name: 'Cap', desc: 'Hackathon merch. Shows on your avatar.', tag: 'Wearable', wear: true },
  { id: 'umbrella', tab: 'wear', icon: 'umbrella', name: 'Umbrella', desc: 'Opens over your head when it rains. Shows on your avatar.', tag: 'Wearable', wear: true, price: 800 },
  { id: 'raincoat', tab: 'wear', icon: 'raincoat', name: 'Raincoat', desc: 'Bright yellow, hood up. Shows on your avatar.', tag: 'Wearable', wear: true, price: 1200 },
  { id: 'glasses', tab: 'wear', icon: 'glasses', name: 'Glasses', desc: 'Blue light filter included. Shows on your avatar.', tag: 'Wearable', wear: true },
  { id: 'firstpush', tab: 'badges', icon: 'push', name: 'First push', desc: 'Earned from a verified push to a public repo.', tag: 'Badge · from verified work', locked: true },
  { id: 'merged', tab: 'badges', icon: 'merge', name: 'Merged upstream', desc: 'Earned when a PR to a repo you do not own is merged.', tag: 'Badge · from verified work', locked: true },
  { id: 'launch', tab: 'badges', icon: 'launch', name: 'Launched', desc: 'Earned from a verified Product Hunt launch.', tag: 'Badge · from verified work', locked: true },
  { id: 'streak', tab: 'badges', icon: 'streak', name: '30-day streak', desc: 'Earned from 30 days with a qualifying push.', tag: 'Badge · from verified work', locked: true },
];

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const placeName = (world) => areaName(areaOf(world.place?.city || 'Lagos', world.place?.name)) || (world.place?.name ?? 'Yaba');
export function createMenus({ world, props, weatherFeed, getPlayer, getPath, snapToStreet, onRoute, onEquip, onPhoto, onRide, toast }) {
  const style = document.createElement('style');
  style.textContent = CSS + WALLET_CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.innerHTML = `<div id="lkm-dim"></div><div id="lkm-set" class="bw-paper" role="dialog" aria-label="Settings"></div><div id="lkm-wal" class="wal2" role="dialog" aria-label="Wallet"></div><div id="lkm-phone" role="dialog" aria-label="Phone"><div class="scr"></div></div>
    <div id="lkm-map" role="dialog" aria-label="Map of ${placeName(world)}"></div><div id="lkm-bag" role="dialog" aria-label="Bag"></div>
    <div class="lkm-hints" hidden></div><div id="lkm-guide" role="dialog" aria-label="Controls"></div>
    <div id="lkm-tip"><span><b>Tab</b>Phone</span><span><b>M</b>Map</span><span><b>I</b>Bag</span><span><b>E</b>Interact</span><span><b>Shift</b>Run</span><span><b>Space</b>Jump</span><span><b>V</b>Camera</span><span><b>C</b>Travel</span><span><b>Q</b>Dog</span><span><b>F</b>Feed</span><span><b>N</b>Music</span><span><b style="white-space:nowrap">1–6</b>Emote</span><span><b>G</b>All emotes</span><span><b>Enter</b>Chat</span></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const dim = $('#lkm-dim'), phone = $('#lkm-phone'), mapEl = $('#lkm-map'), bagEl = $('#lkm-bag'), hints = $('.lkm-hints'), guide = $('#lkm-guide'), setEl = $('#lkm-set'), walEl = $('#lkm-wal');
  let open = null;
  loadFont();
  const profile = (() => { try { return loadProfile(); } catch { return null; } })();
  const me = { color: profile?.avatar?.color || '#e2b13c' };
  me.look = personFor((BUILDERS.find((b) => b.id === 'you')?.seed ?? 1) * 31 + Math.max(0, BUILDERS.findIndex((b) => b.id === 'you')) * 5, { shirt: me.color });
  let equipped = store.get('bw-bag-equipped', ['backpack']);
  equipped.forEach((id) => onEquip?.(id, true));

  function setHints(list) {
    hints.hidden = !list;
    hints.innerHTML = (list || []).map(([k, t]) => `<span><b>${k}</b>${t}</span>`).join('');
  }
  function close() {
    if (open) sfx('close');
    [phone, mapEl, bagEl, setEl, walEl].forEach((p) => p.classList.remove('on'));
    dim.classList.remove('on');
    setHints(null);
    open = null;
  }
  function show(el, hintList) {
    const was = open;
    close();
    if (!was) sfx('open');
    dim.classList.add('on');
    el.classList.add('on');
    setHints(hintList);
    open = el;
  }
  dim.onclick = close;

  // ---------- phone ----------
  let radioApp = null;
  const radio = () => radioApp || (radioApp = createRadio({ city: world.place?.city || 'Lagos', toast }));
  const APPS = [
    ['Map', 'map', '#8ed3c4', () => openMap()],
    ['Bag', 'bag', '#f2c46b', () => openBag()],
    ['Board', 'board', '#f6b3a8', () => { close(); props.openBoard?.(); }],
    ['Builders', 'people', '#a9dc8f', () => openMap(true)],
    ['Camera', 'camera', '#d3b4f2', () => { close(); onPhoto?.(); }],
    ['Ride', 'car', '#f7d36b', () => { close(); onRide?.(); }],
    ['Build', 'build', '#9fd6ef', () => { close(); onRoute?.(props.area, 'Community build area'); }],
    ['Wallet', 'wallet', '#b7e0a0', () => openWallet()],
    ['Aerial', 'aerial', '#c9e3f2', () => { close(); dispatchEvent(new KeyboardEvent('keydown', { key: 'b' })); }],
    ['Cities', 'globe', '#f4c98a', () => { close(); location.search = '?world=1&view=cities'; }],
    ['Travel', 'plane', '#bfe3f7', () => { close(); dispatchEvent(new Event('bw:fly')); }],
    // the city's own FM stations, live (radio.js)
    ['Radio', 'radio', '#f4b9a6', () => { close(); radio().open(); }],
    ['Weather', 'weather', '#aebcff', () => { const w = weatherFeed?.state; toast(w ? `${w.loc.label}: ${w.label}${w.tempC != null ? `, ${Math.round(w.tempC)}°C` : ''}. Updated every 10 minutes.` : 'Weather is loading.'); }],
    ['Pets', 'paw', '#c9e3a8', () => { close(); dispatchEvent(new Event('bw:shelter')); }],
    ['Wardrobe', 'hanger', '#f6c7b8', () => { close(); dispatchEvent(new Event('bw:wardrobe')); }],
    ['Wi-Fi', 'wifi', '#bfe8df', () => openWifi()],
    ['Settings', 'settings', '#d8cfbd', () => openSettings()],
    ['Sports', 'sport', '#f6c3a0', () => {
      // the nearest court, pool or chess table: a route there
      const P = getPlayer?.() || { x: 0, z: 0 };
      const spots = (props.pois || []).filter((q) => q.kind === 'recreation' && /Sports|Arena|Chess/.test(q.name)).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
      close();
      if (!spots.length) { toast('No sports here yet.'); return; }
      onRoute?.(spots[0], spots[0].name); toast(`${spots[0].name}: follow the line. Tennis, padel, basketball, the pool, table tennis and chess are all playable.`, 3600);
    }],
    ['Help', 'help', '#f0e1bd', () => { close(); showGuide(); }],
  ];
  // the apps that need the internet; the rest (camera, map, bag, wardrobe, settings...) work without it
  const ONLINE = new Set(['Builders', 'Board', 'Ride', 'Wallet', 'Travel', 'Radio', 'Weather']);
  const here = () => getPlayer?.() || { x: 0, z: 0 };
  const netNow = () => passesEngine().phoneLink(here(), equipped.includes('router'));
  const WAVES = (bars, col = 'currentColor') => `<svg viewBox="0 0 24 20" width="20" height="17" aria-hidden="true">${[0, 1, 2].map((k) => `<path d="M${12 - 4 - k * 3.5} ${14 - k * 3.4}a${4 + k * 3.5} ${4 + k * 3.5} 0 0 1 ${8 + k * 7} 0" fill="none" stroke="${col}" stroke-opacity="${k < Math.ceil(bars * 3 / 4) ? 1 : 0.25}" stroke-width="2.6" stroke-linecap="round"/>`).join('')}<circle cx="12" cy="16.5" r="2" fill="${col}" fill-opacity="${bars ? 1 : 0.25}"/></svg>`;
  const NOWAVE = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9a12 12 0 0 1 16 0M7.5 12.5a7 7 0 0 1 9 0" fill="none" stroke="#b9ab93" stroke-width="2.4" stroke-linecap="round"/><path d="M4 4l16 16" stroke="${C.coral}" stroke-width="2.6" stroke-linecap="round"/></svg>`;
  const netBar = () => { const n = netNow(); return n ? `<span class="net" title="${n.ssid}">${WAVES(n.bars)}${n.mifi ? 'MiFi' : ''}</span>` : `<span class="net none">${NOWAVE}No Wi-Fi</span>`; };
  const LOCPIN = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 18s-5-5-5-8a5 5 0 0 1 10 0c0 3-5 8-5 8z" fill="currentColor"/></svg>`;
  // twelve apps a page; the dots, a swipe, the scroll wheel or the arrow keys turn the page
  const PAGE = 12;
  let phonePage = 0;
  function openPhone(page = 0, focusK = null) {
    const time = weatherFeed ? weatherFeed.localTime() : new Date().toTimeString().slice(0, 5);
    const pages = Math.ceil(APPS.length / PAGE);
    phonePage = Math.max(0, Math.min(pages - 1, page));
    const list = APPS.map((a, k) => [a, k]).slice(phonePage * PAGE, phonePage * PAGE + PAGE);
    phone.querySelector('.scr').innerHTML = `
      <div class="bar">${netBar()}<span>${time}</span>${LOCPIN}</div>
      <h2>Builders</h2>
      <div class="grid">${(() => { const off = !netNow(); return list.map(([[n, i, c], k]) => { const dead = off && ONLINE.has(n); return `<button class="app ${dead ? 'off' : ''}" data-k="${k}" aria-label="${n}${dead ? ' (needs Wi-Fi)' : ''}"><i style="background:${c}">${appIcon(i)}</i>${dead ? `<b class="nw">${NOWAVE}</b>` : ''}<span>${n}</span></button>`; }).join(''); })()}</div>
      <div class="dots">${Array.from({ length: pages }, (_, k) => `<button class="${k === phonePage ? 'on' : ''}" data-page="${k}" aria-label="Page ${k + 1}"></button>`).join('')}</div>`;
    phone.querySelectorAll('[data-page]').forEach((d) => { d.onclick = () => openPhone(+d.dataset.page); });
    const grid = phone.querySelector('.grid');
    let wheelT = 0, sx = null;
    grid.onwheel = (e) => { const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (Math.abs(d) < 12 || performance.now() - wheelT < 450) return; wheelT = performance.now(); e.preventDefault(); openPhone(phonePage + (d > 0 ? 1 : -1)); };
    grid.onpointerdown = (e) => { sx = e.clientX; };
    grid.onpointerup = (e) => { if (sx != null && Math.abs(e.clientX - sx) > 50) openPhone(phonePage + (e.clientX < sx ? 1 : -1)); sx = null; };
    const title = phone.querySelector('h2');
    phone.querySelectorAll('.app').forEach((b) => {
      const name = APPS[+b.dataset.k][0];
      // no Wi-Fi, an app that needs it: the Wi-Fi screen instead, saying why
      b.onclick = () => (ONLINE.has(name) && !netNow() ? openWifi(name) : APPS[+b.dataset.k][3]());
      b.onmouseenter = b.onfocus = () => { title.textContent = name; };
    });
    phone.querySelector('.grid').onmouseleave = () => { title.textContent = phone.contains(document.activeElement) ? document.activeElement.getAttribute('aria-label') || 'Builders' : 'Builders'; };
    show(phone, [['Esc', 'Put away'], ['Enter', 'Open'], ['← →', 'More apps']]);
    ((focusK != null && phone.querySelector(`.app[data-k="${focusK}"]`)) || phone.querySelector('.app'))?.focus();
  }
  // the Wi-Fi screen: what you are on, the networks here, joining one, the nearest free hotspot, where passwords are
  function openWifi(why = null, joining = null, err = '') {
    const P = passesEngine(), pos = here(), now = netNow(), nets = P.phoneNets(pos), known = P.known(), N = P.NETS;
    const time = weatherFeed ? weatherFeed.localTime() : new Date().toTimeString().slice(0, 5);
    const near = now ? null : P.nearestHotspot(pos), dist = near ? Math.round(near.d / 10) * 10 : 0;
    const where = (n) => (n.ssid === N.free.ssid ? 'Password pinned on the community board' : n.ssid === N.district.ssid ? `Password on your ${world.place?.name || 'district'} resident card (Bag, Cards)` : n.where || (n.near ? `Password inside ${n.near}` : ''));
    phone.querySelector('.scr').innerHTML = `
      <div class="bar">${netBar()}<span>${time}</span>${LOCPIN}</div>
      <div class="wf"><button class="back">‹ Apps</button><h3>Wi-Fi</h3>
        ${why ? `<p class="why">${why} needs the internet. Join a network first.</p>` : ''}
        <div class="now">${now ? `On <b>${now.ssid}</b>${now.mifi ? ': your own data, from the router in your bag' : ''}` : 'Not connected'}</div>
        <h4>Networks here</h4>
        ${nets.length ? nets.map((n) => { const on = now?.ssid === n.ssid, saved = known[n.ssid] === n.pass; return `<div class="nw2">${WAVES(n.bars, C.ink)}<span><b>${n.ssid}</b><small>${on ? 'Connected' : saved ? 'Saved' : where(n)}</small></span>${on || saved ? `<span class="ok">${on ? '✓' : ''}</span>` : `<button data-j="${n.ssid}">Join</button>`}
          ${joining === n.ssid ? `<form data-f="${n.ssid}"><input type="text" autocomplete="off" spellcheck="false" placeholder="Password" aria-label="Password for ${n.ssid}"><button>Join</button></form>${err ? `<div class="err">${err}</div>` : ''}` : ''}</div>`; }).join('') : '<p class="now">No networks here.</p>'}
        ${near ? `<h4>Nearest free Wi-Fi</h4><div class="near"><span><b>${N.free.ssid}</b><br>at ${near.name}${dist >= 10 ? `, about ${dist} m` : ': you are in range, join it above'}</span>${dist >= 10 ? '<button class="go" data-go>Show the way</button>' : ''}</div>` : ''}
        <h4>Where the passwords are</h4>
        <ul><li><b>${N.free.ssid}</b>: pinned on the community board</li><li><b>${N.district.ssid}</b>: on your resident card (Bag, Cards)</li><li>Cafes, hubs and lofts: on the notice or menu board inside</li><li>Or carry a MiFi router (Bag, Gadgets): your own data, anywhere</li></ul>
      </div>`;
    phone.querySelector('.back').onclick = () => openPhone(phonePage);
    phone.querySelectorAll('[data-j]').forEach((b) => { b.onclick = () => openWifi(why, b.dataset.j); });
    phone.querySelector('[data-go]')?.addEventListener('click', () => { close(); onRoute?.(near, near.name); toast(`Free Wi-Fi at ${near.name}. The password is on the community board.`, 3400); });
    const f = phone.querySelector('form');
    if (f) {
      const inp = f.querySelector('input'); setTimeout(() => inp.focus(), 30);
      f.onsubmit = (e) => {
        e.preventDefault();
        const r = passesEngine().phoneJoin(here(), f.dataset.f, inp.value);
        if (!r.ok) { openWifi(why, f.dataset.f, r.why); return; }
        sfx('interact'); toast(`Connected to ${f.dataset.f}.`, 2200);
        // back to the app you wanted, now that it works
        const app = why && APPS.find((a) => a[0] === why);
        if (app) app[3](); else openWifi();
      };
    } else (phone.querySelector('[data-j], [data-go], .back'))?.focus();
    show(phone, [['Esc', 'Put away']]);
  }

  // arrow keys walk the grid, and off its edge onto the next or previous page
  function phoneArrow(k) {
    if (phone.querySelector('.wf')) return; // the Wi-Fi screen: the arrows are the page's own
    const btns = [...phone.querySelectorAll('.app')], cur = btns.indexOf(document.activeElement), i = cur < 0 ? 0 : cur;
    const col = i % 3, step = { arrowright: 1, arrowleft: -1, arrowdown: 3, arrowup: -3 }[k];
    let j = i + step;
    if ((k === 'arrowright' && (col === 2 || j >= btns.length)) || (k === 'arrowleft' && col === 0)) {
      const pages = Math.ceil(APPS.length / PAGE), np = phonePage + (k === 'arrowright' ? 1 : -1);
      if (np >= 0 && np < pages) { const firstK = np * PAGE; openPhone(np, k === 'arrowright' ? firstK : Math.min(APPS.length - 1, firstK + PAGE - 1)); }
      return;
    }
    j = Math.max(0, Math.min(btns.length - 1, j));
    btns[j]?.focus();
  }

  // ---------- map ----------
  const places = [
    props.interact.find((i) => i.id === 'board') && { id: 'board', name: 'Community board', sub: 'Notes and neighbours', art: 'board', glyph: 'board', at: props.interact.find((i) => i.id === 'board') },
    props.area && { id: 'build', name: 'Build area', sub: `Add a bench for ${placeName(world)}`, art: 'build', glyph: 'build', at: props.area },
    props.hubAt && { id: 'hub', name: `${placeName(world)} Creative Hub`, sub: 'Desks, wifi, people', art: 'hub', glyph: 'people', at: props.hubAt },
    (() => { const p = world.plots.find((pl) => pl.b.id === 'you'); return p && { id: 'home', name: 'Your plot', sub: 'Grows with your work', art: 'home', glyph: 'home', at: { x: p.center.x, z: p.center.z } }; })(),
  ].filter(Boolean);
  // services on the map (world bible 11.3): each kind has an illustrated icon and a colour
  const KINDS = {
    atm: { label: 'ATMs', glyph: 'atm', color: '#2a9d94' }, food: { label: 'Food', glyph: 'food', color: '#e46f4f' },
    cafe: { label: 'Cafes', glyph: 'cafe', color: '#a87950' }, fuel: { label: 'Fuel', glyph: 'fuel', color: '#e46f4f' },
    bus: { label: 'Rides', glyph: 'bus', color: '#f2b33d' }, work: { label: 'Workspaces', glyph: 'work', color: '#4a64b0' },
    shop: { label: 'Shops', glyph: 'shop', color: '#7d5aa6' }, park: { label: 'Parks', glyph: 'build', color: '#5f9a45' }, recycle: { label: 'Recycling', glyph: 'recycle', color: '#4f8a4a' }, police: { label: 'Police', glyph: 'people', color: '#1f3d7a' }, landmark: { label: 'Landmarks', glyph: 'build', color: '#c0462f' }, gym: { label: 'Gyms', glyph: 'gym', color: '#326952' },
  };
  const poiIcon = {};
  Object.entries(KINDS).forEach(([k, d]) => {
    const glyph = appIcon(d.glyph).replace(/^<svg[^>]*>|<\/svg>$/g, '');
    const img = new Image();
    img.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="29" fill="${d.color}" stroke="#fff" stroke-width="4"/><circle cx="32" cy="32" r="22" fill="${C.paper}"/><g transform="translate(14 14) scale(.75)">${glyph}</g></svg>`)}`;
    img.onload = () => { if (open === mapEl) drawBigMap(); };
    poiIcon[k] = img;
  });
  const poisOf = (k) => (props.pois || []).filter((p) => p.kind === k);
  let poiFilter = null; // a kind to highlight, or null for all

  // facility badges on the map: black discs with a light glyph, drawn once from SVG
  const badges = {};
  places.forEach((pl) => {
    const glyph = appIcon(pl.glyph).replaceAll(C.ink, '#__INK').replaceAll(C.paper, C.ink).replaceAll('#__INK', C.paper);
    const img = new Image();
    img.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="30" fill="${C.ink}" stroke="#fff" stroke-width="3"/><g transform="translate(10 10) scale(.92)">${glyph.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></svg>`)}`;
    img.onload = () => { if (open === mapEl) drawBigMap(); };
    badges[pl.id] = img;
  });
  const people = BUILDERS.map((b, i) => ({ b, look: personFor((b.seed ?? 1) * 31 + i * 5, b.id === 'you' ? { shirt: me.color } : {}) }));
  // residents as they really look: their 3D avatar (portraits.js); you in your own saved look
  const HAIRS_F = ['braids', 'gele', 'bun', 'afro'], HAIRS_M = ['low', 'afro', 'fade', 'locs'];
  const look3d = ({ b, look }) => {
    if (b.id === 'you') { try { const st = JSON.parse(localStorage.getItem('bw-style') || 'null'); if (st) return st; } catch { /* storage unavailable */ } return DEFAULT_LOOK; }
    const fem = [2, 3, 4, 5].includes(look.style);
    return { ...DEFAULT_LOOK, body: fem ? 'f' : 'm', skin: look.skin, hairColor: look.hair, hair: fem ? HAIRS_F[look.style - 2] : HAIRS_M[look.style % 4], top: ['tee', 'jacket', 'hoodie', 'ankara'][(b.seed ?? 0) % 4], topColor: look.shirt, bottom: fem && look.style === 3 ? 'skirt' : 'trousers', acc: look.glasses ? ['glasses'] : [] };
  };
  const portraitOf = (b) => { const p = people.find((q) => q.b === b); return p ? avatarPortrait(look3d(p), 160) : ''; };
  const onlineIds = () => new Set(onlineNow.players.filter((q) => q.id !== onlineNow.me).map((q) => q.id));
  const isOnline = (b) => b.id === 'you' || !!b.live || onlineIds().has(b.id);
  const onlineCount = () => people.filter(({ b }) => isOnline(b)).length + onlineNow.players.filter((q) => q.id !== onlineNow.me && !people.some(({ b }) => b.id === q.id)).length;
  const RES_SHOW = 8; let resQuery = '', resAll = false;
  const resList = () => { const q = resQuery.trim().toLowerCase(); const list = people.filter(({ b }) => !q || b.name.toLowerCase().includes(q) || (b.handle || '').toLowerCase().includes(q)); return q || resAll ? list : list.slice(0, RES_SHOW); };
  let selRes = null, selPlace = null, panMoved = 0;
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = mapCanvas.height = 900;
  // the map fills its whole window (Elvis, 10 October 2026: zoomed in, a square frame cut the map off); it is drawn
  // in a 900 unit square, scaled to fit the window and centred in it (MK, OX, OY), the rest of the window is sea
  let cw = 900, ch = 900, MK = 1, OX = 0, OY = 0;
  const sizeMap = () => { const m = mapEl.querySelector('.mid'); if (!m) return; const rc = m.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cw = Math.max(300, Math.round(rc.width * dpr)); ch = Math.max(300, Math.round(rc.height * dpr)); mapCanvas.width = cw; mapCanvas.height = ch; MK = Math.min(cw, ch) / 900; OX = (cw - 900 * MK) / 2; OY = (ch - 900 * MK) / 2; };
  const vis = (x, y) => x > -OX / MK && x < (cw - OX) / MK && y > -OY / MK && y < (ch - OY) / MK;
  addEventListener('resize', () => { if (mapEl.classList.contains('on')) { sizeMap(); drawBigMap(); } });
  const MAPR = world.radius * 1.12;
  // the view: zoom and pan (world bible 11.3). base() is the whole-district map; toPx() is the screen
  const view = { z: 1, cx: 450, cy: 450 };
  const base = (x, z) => [(x / MAPR) * 360 + 450, (z / MAPR) * 360 + 450];
  const toPx = (x, z) => { const [bx, by] = base(x, z); return [(bx - view.cx) * view.z + 450, (by - view.cy) * view.z + 450]; };
  const fromPx = (px, py) => { const bx = (px - 450) / view.z + view.cx, by = (py - 450) / view.z + view.cy; return [((bx - 450) / 360) * MAPR, ((by - 450) / 360) * MAPR]; };
  const clampView = () => { view.z = Math.max(1, Math.min(6, view.z)); const lim = 450 - 450 / view.z; view.cx = Math.max(450 - lim, Math.min(450 + lim, view.cx)); view.cy = Math.max(450 - lim, Math.min(450 + lim, view.cy)); };
  // addresses and zones, worked out once: every garden gets a number on its nearest named street, and
  // gardens on the same street make an estate; services make commercial strips; the pond is a park
  let zoning = null;
  function zones() {
    if (zoning) return zoning;
    const named = world.roads.filter((r) => r.name && !['footway', 'path', 'cycleway', 'pedestrian'].includes(r.cls));
    const nearestRoad = (x, z) => { let best = null, bd = Infinity, along = 0, side = 1; named.forEach((r) => { let acc = 0; for (let i = 0; i < r.pts.length - 1; i++) { const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L * L))), d = Math.hypot(x - ax - dx * u, z - az - dz * u); if (d < bd) { bd = d; best = r; along = acc + u * L; side = (dx * (z - az) - dz * (x - ax)) > 0 ? 1 : 0; } acc += L; } }); return { r: best, d: bd, along, side }; };
    // planned estates carry their own numbers: 3B, Gate 2, Onike Court (src/estates.js)
    if (world.addresses?.length) {
      const TINT = ['#f6e7b8', '#e8f0c8', '#f6d6c2', '#dcecdc', '#efe0f2', '#e2eef4', '#f4e8d0'], names = [...new Set(world.addresses.map((a) => a.estate))];
      const lotsE = world.addresses.map((a) => ({ pts: a.pts, c: [a.x, a.z], no: a.no, addr: a.addr, tint: TINT[names.indexOf(a.estate) % TINT.length] }));
      const estateLabels = (world.estates || []).map((E) => ({ name: E.name, x: E.corners.reduce((q, c) => q + c[0] / 4, 0), z: E.corners.reduce((q, c) => q + c[1] / 4, 0), n: E.gates.length * 10 }));
      const COMM = ['shop', 'food', 'cafe', 'fuel'], CIVIC = ['atm', 'work', 'board', 'build'];
      zoning = { lots: lotsE, estateLabels, comm: (props.pois || []).filter((q) => COMM.includes(q.kind)), civic: (props.pois || []).filter((q) => CIVIC.includes(q.kind)) };
      return zoning;
    }
    const lots = (world.lots || []).map((pts) => { const c = pts.reduce((a, [x, z]) => [a[0] + x / pts.length, a[1] + z / pts.length], [0, 0]); return { pts, c, ...nearestRoad(c[0], c[1]) }; }).filter((l) => l.r && l.d < 60);
    const estates = new Map();
    lots.forEach((l) => { const k = l.r.name; if (!estates.has(k)) estates.set(k, []); estates.get(k).push(l); });
    const PAL = ['#f6e7b8', '#e8f0c8', '#f6d6c2', '#dcecdc', '#efe0f2', '#e2eef4', '#f4e8d0'];
    let ei = 0;
    estates.forEach((list, name) => {
      // odd numbers on one side, even on the other, counting up along the street
      [0, 1].forEach((sd) => list.filter((l) => l.side === sd).sort((a, b) => a.along - b.along).forEach((l, i) => { l.no = 2 * i + 1 + sd; }));
      const short = name.replace(/ Street$/, ' St').replace(/ Road$/, ' Rd').replace(/ Avenue$/, ' Ave').replace(/ Way$/, ' Way');
      list.forEach((l) => { l.addr = `${l.no} ${short}`; l.tint = PAL[ei % PAL.length]; });
      ei++;
    });
    const estateLabels = [...estates.entries()].filter(([, list]) => list.length >= 4).map(([name, list]) => ({ name: `${name.replace(/ (Street|Road|Avenue|Way)$/, '')} Estate`, x: list.reduce((a, l) => a + l.c[0], 0) / list.length, z: list.reduce((a, l) => a + l.c[1], 0) / list.length, n: list.length }));
    const COMM = ['shop', 'food', 'cafe', 'fuel'], CIVIC = ['atm', 'work', 'board', 'build'];
    zoning = { lots, estateLabels, comm: (props.pois || []).filter((q) => COMM.includes(q.kind)), civic: (props.pois || []).filter((q) => CIVIC.includes(q.kind)) };
    return zoning;
  }
  const ROOF = ['#efe3c8', '#e2a07c', '#a9d3d4', '#eacb7a', '#d3c3e2', '#f2d6b8'];
  const hash = (pts) => Math.abs(Math.round(pts[0][0] * 13 + pts[0][1] * 7));
  function drawBigMap() {
    const g = mapCanvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch); g.setTransform(MK, 0, 0, MK, OX, OY);
    // a rectangle of map (the UI brief: not a circle): the whole mapped square is land, edge to edge of the view;
    // beyond the mapped square the canvas stays blank
    // everything on the ground is drawn in district coordinates under the zoom; labels and icons stay crisp
    g.save(); g.setTransform(MK * view.z, 0, 0, MK * view.z, OX + MK * (450 - view.cx * view.z), OY + MK * (450 - view.cy * view.z));
    g.save(); g.beginPath(); g.rect(0, 0, 900, 900); g.clip();
    g.fillStyle = C.leaf; g.fillRect(0, 0, 900, 900);
    g.fillStyle = 'rgba(140,200,105,.55)';
    for (let i = 0; i < 26; i++) { const a = i * 2.4, r = (i * 53) % 330; g.beginPath(); g.arc(450 + Math.cos(a) * r, 450 + Math.sin(a) * r, 40 + (i % 5) * 12, 0, 7); g.fill(); }
    // trees as little triangles, where the street trees really are
    g.fillStyle = '#4f8a3a';
    // zones: estates in soft tints by street, commercial strips in coral, civic in teal, the pond in water blue
    const Z = zones();
    Z.lots.forEach((l) => { g.fillStyle = l.tint; g.beginPath(); l.pts.forEach(([x, z], i) => { const [px, py] = base(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill(); });
    Z.comm.forEach((q) => { const [x, y] = base(q.x, q.z); g.fillStyle = 'rgba(228,111,79,.16)'; g.beginPath(); g.arc(x, y, (16 / MAPR) * 360, 0, 7); g.fill(); });
    Z.civic.forEach((q) => { const [x, y] = base(q.x, q.z); g.fillStyle = 'rgba(42,157,148,.16)'; g.beginPath(); g.arc(x, y, (12 / MAPR) * 360, 0, 7); g.fill(); });
    if (props.pond) { const pd = props.pond, [x, y] = base(pd.x, pd.z); g.fillStyle = '#7fc4c4'; g.beginPath(); g.ellipse(x, y, (pd.rx / MAPR) * 360, (pd.rz / MAPR) * 360, 0, 0, 7); g.fill(); }
    const ts = 1 / Math.sqrt(view.z);
    (world.trees || []).forEach((t) => { const [x, y] = base(t.x, t.z); g.beginPath(); g.moveTo(x, y - 7 * ts); g.lineTo(x + 6 * ts, y + 4 * ts); g.lineTo(x - 6 * ts, y + 4 * ts); g.closePath(); g.fill(); });
    // roads: a darker casing under a cream surface
    g.lineCap = 'round'; g.lineJoin = 'round';
    const roads = world.roads.filter((r) => !['footway', 'path', 'cycleway', 'pedestrian'].includes(r.cls));
    const line = (r) => { g.beginPath(); r.pts.forEach(([x, z], i) => { const [px, py] = base(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); };
    // true road width once zoomed in; a readable minimum when the whole district is in view
    const rw = (r) => Math.max(9 / view.z, r.w * (360 / MAPR));
    // each kind of road in its own colour (roadclass.js), the small ones drawn first so the big ones run over them
    const rank = (r) => ROAD_KINDS.findIndex(([k]) => k === roadClass(r.cls).kind), colourOf = (r) => ROAD_KINDS[rank(r)]?.[2] || '#f0deb0';
    const byRank = [...roads].sort((a, b) => rank(a) - rank(b));
    byRank.forEach((r) => { g.strokeStyle = '#c4a46c'; g.lineWidth = rw(r) + 6 / view.z; line(r); g.stroke(); });
    byRank.forEach((r) => { g.strokeStyle = colourOf(r); g.lineWidth = rw(r); line(r); g.stroke(); });
    world.roads.filter((r) => !roads.includes(r)).forEach((r) => { g.strokeStyle = 'rgba(240,222,176,.8)'; g.lineWidth = 3 / view.z; g.setLineDash([2 / view.z, 7 / view.z]); line(r); g.stroke(); g.setLineDash([]); });
    // buildings: coloured roofs with a soft shadow, like blocks on a model
    (world.footprints || []).forEach((pts) => {
      const path = () => { g.beginPath(); pts.forEach(([x, z], i) => { const [px, py] = base(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); };
      g.save(); g.translate(2.5 / view.z, 3.5 / view.z); g.fillStyle = 'rgba(59,42,32,.28)'; path(); g.fill(); g.restore();
      g.fillStyle = ROOF[hash(pts) % ROOF.length]; path(); g.fill();
      g.strokeStyle = 'rgba(59,42,32,.4)'; g.lineWidth = 1.4 / view.z; g.stroke();
    });
    g.restore();
    g.restore();
    // estate names, faint and large, while the whole district is in view
    if (view.z < 2.2) {
      g.font = `800 ${Math.round(20 * Math.min(1.4, view.z))}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const placed = [];
      Z.estateLabels.sort((a, b) => b.n - a.n).forEach((e) => { const [x, y] = toPx(e.x, e.z); const w = g.measureText(e.name).width; if (x < 40 || x > 860 || y < 40 || y > 860 || placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 && Math.abs(p.y - y) < 34)) return; placed.push({ x, y, w }); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.75)'; g.strokeText(e.name, x, y); g.fillStyle = 'rgba(59,42,32,.55)'; g.fillText(e.name, x, y); });
    }
    // zoomed in: house numbers, then full addresses
    if (view.z >= 2.2) {
      g.font = `800 ${view.z >= 3.4 ? 12 : 11}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      Z.lots.forEach((l) => { const [x, y] = toPx(l.c[0], l.c[1]); if (!vis(x, y)) return; const t = view.z >= 3.4 ? l.addr : String(l.no); const w = g.measureText(t).width + 10; g.fillStyle = 'rgba(247,239,220,.92)'; g.beginPath(); g.roundRect(x - w / 2, y - 9, w, 18, 9); g.fill(); g.fillStyle = C.ink; g.fillText(t, x, y + 1); });
    }
    // street names: once per street, on its longest stretch, never on top of another
    g.font = `800 ${view.z > 1.5 ? 17 : 15}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const taken = [];
    const byName = new Map();
    roads.forEach((r) => { if (!r.name) return; const L = r.pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]) : 0), 0); if (L > 70 / view.z && (!byName.has(r.name) || byName.get(r.name).L < L)) byName.set(r.name, { r, L }); });
    [...byName.values()].sort((a, b) => b.L - a.L).forEach(({ r }) => {
      // the stretch of this street nearest the middle of the view that is long enough to carry the name
      let k = Math.floor(r.pts.length / 2), bd = Infinity;
      for (let i = 1; i < r.pts.length; i++) { const [x1, y1] = toPx(r.pts[i - 1][0], r.pts[i - 1][1]), [x2, y2] = toPx(r.pts[i][0], r.pts[i][1]), mx = (x1 + x2) / 2, my = (y1 + y2) / 2; if (Math.hypot(x2 - x1, y2 - y1) < 60) continue; const d = Math.hypot(mx - 450, my - 450); if (d < bd) { bd = d; k = i; } }
      const m = r.pts[Math.max(0, k - 1)], n = r.pts[k];
      const [px, py] = toPx((m[0] + n[0]) / 2, (m[1] + n[1]) / 2), [ax, ay] = toPx(m[0], m[1]), [bx, by] = toPx(n[0], n[1]);
      if (px < 30 || px > 870 || py < 30 || py > 870) return;
      const w = g.measureText(r.name).width;
      if (taken.some((t) => Math.abs(t.x - px) < (t.w + w) / 2 + 6 && Math.abs(t.y - py) < 30)) return;
      taken.push({ x: px, y: py, w });
      let a = Math.atan2(by - ay, bx - ax); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
      g.save(); g.translate(px, py); g.rotate(a);
      g.lineWidth = 5; g.strokeStyle = '#f0deb0'; g.strokeText(r.name, 0, 1); g.fillStyle = C.ink; g.fillText(r.name, 0, 1);
      g.restore();
    });
    // neighbours' plots as little houses, yours in amber
    world.plots.forEach((p, i) => {
      const [x, y] = toPx(p.center.x, p.center.z);
      const sel = selRes === p.b.id;
      g.fillStyle = p.b.id === 'you' ? C.amber : ['#f2a35e', '#f2a35e', '#e98a6a', '#f2b85e'][i % 4];
      g.strokeStyle = sel ? '#fff' : C.ink; g.lineWidth = sel ? 5 : 2.6;
      const s = sel ? 1.35 : 1;
      g.beginPath(); g.moveTo(x, y - 16 * s); g.lineTo(x + 15 * s, y - 3 * s); g.lineTo(x + 11 * s, y - 3 * s); g.lineTo(x + 11 * s, y + 11 * s); g.lineTo(x - 11 * s, y + 11 * s); g.lineTo(x - 11 * s, y - 3 * s); g.lineTo(x - 15 * s, y - 3 * s); g.closePath();
      g.stroke(); g.fill(); if (sel) { g.strokeStyle = C.ink; g.lineWidth = 2.6; g.stroke(); }
      g.fillStyle = C.ink; g.fillRect(x - 3 * s, y + 3 * s, 6 * s, 8 * s);
    });
    // places as black badges
    places.forEach((pl) => {
      const [x, y] = toPx(pl.at.x, pl.at.z), r = selPlace === pl.id ? 26 : 19;
      if (badges[pl.id]?.complete) g.drawImage(badges[pl.id], x - r, y - r, r * 2, r * 2);
    });
    // services
    (props.pois || []).forEach((q) => {
      if (!KINDS[q.kind] || !poiIcon[q.kind]?.complete) return;
      const [x, y] = toPx(q.x, q.z), on = !poiFilter || poiFilter === q.kind, r = poiFilter === q.kind ? 20 : 14;
      g.globalAlpha = on ? 1 : 0.3; g.drawImage(poiIcon[q.kind], x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
      if (view.z >= 2.6 && vis(x, y)) { g.font = `800 12px ${FONT}`; g.textAlign = 'center'; const w = g.measureText(q.name).width + 12; g.fillStyle = C.paper; g.beginPath(); g.roundRect(x - w / 2, y + r + 2, w, 18, 9); g.fill(); g.fillStyle = C.ink; g.textBaseline = 'middle'; g.fillText(q.name, x, y + r + 11); }
    });
    // the route: white footsteps over a teal line
    const route = getPath?.();
    if (route) {
      const pathTo = () => { g.beginPath(); route.forEach((p, i) => { const [x, y] = toPx(p.x, p.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); };
      g.strokeStyle = C.teal; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; pathTo(); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 6; g.setLineDash([1, 13]); pathTo(); g.stroke(); g.setLineDash([]);
    }
    // other players online: a green dot and their name
    onlineNow.players.forEach((q) => { if (q.id === onlineNow.me) return; const [ox, oy] = toPx(q.x, q.z); g.fillStyle = '#fff'; g.beginPath(); g.arc(ox, oy, 11, 0, 7); g.fill(); g.fillStyle = '#3fbf6d'; g.beginPath(); g.arc(ox, oy, 8, 0, 7); g.fill();
      g.font = `700 18px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#fff'; g.strokeText(q.name, ox, oy - 17); g.fillStyle = C.ink; g.fillText(q.name, ox, oy - 17); });
    // you are here: a coral pin
    const me2 = getPlayer();
    const [px, py] = toPx(me2.x, me2.z);
    g.fillStyle = C.coral; g.strokeStyle = '#fff'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(px, py); g.bezierCurveTo(px - 22, py - 26, px - 18, py - 52, px, py - 52); g.bezierCurveTo(px + 18, py - 52, px + 22, py - 26, px, py); g.closePath(); g.stroke(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py - 34, 8, 0, 7); g.fill();
  }
  function openMap(focusResidents = false) {
    mapEl.innerHTML = `
      <div class="col">${(() => { const others = onlineNow.players.filter((q) => q.id !== onlineNow.me); return others.length ? `<h3>Online now</h3><div class="onl">${others.map((q) => `<div class="o"><button data-o="${q.id}"><i></i><span>${String(q.name).replace(/[<>&"]/g, '')}<small>${Math.round(Math.hypot(q.x - getPlayer().x, q.z - getPlayer().z))} m away</small></span></button><button class="j" data-j="${q.id}">Jump</button></div>`).join('')}</div>` : ''; })()}<h3>Residents</h3><div class="rhead"><b>${people.length}</b> resident${people.length === 1 ? '' : 's'} · <span class="on">${onlineCount()} online</span></div>
        <input class="rsearch" type="search" placeholder="Search residents" aria-label="Search residents" value="${resQuery.replace(/"/g, '&quot;')}">
        <div class="res">${resList().map(({ b }) => `<button data-id="${b.id}" class="${selRes === b.id ? 'sel' : ''}" aria-label="${b.name}">
        <span class="hs"><img alt="" src="${portraitOf(b)}">${isOnline(b) ? '<i class="live" title="Online now"></i>' : ''}</span>${b.name.split(' ')[0]}</button>`).join('') || '<p class="hint">Nobody by that name lives here yet.</p>'}</div>
        ${!resQuery && people.length > RES_SHOW ? `<button class="rall">${resAll ? 'Show fewer' : `View all ${people.length}`}</button>` : ''}</div>
      <div class="mid"><div class="ribbon">${ribbonSVG(380)}<b>${placeName(world)}<small>${cityLabel(world.place?.city ?? 'Lagos')}</small></b></div><div class="bubble"></div></div>
      <div class="col"><h3>Places</h3><div class="places">${places.map((p) => `<button data-p="${p.id}" class="${selPlace === p.id ? 'sel' : ''}">${placeArt(p.art)}<span>${p.name}<small>${p.sub}</small></span></button>`).join('')}</div>
        <h3 style="position:static;transform:none;display:inline-block;margin:16px 0 8px">Find nearest</h3>
        <div class="kinds">${Object.entries(KINDS).filter(([k]) => poisOf(k).length).map(([k, d]) => `<button data-kind="${k}" class="${poiFilter === k ? 'sel' : ''}"><i style="background:${d.color}">${appIcon(d.glyph)}</i><span>${d.label}<small>${poisOf(k).length}</small></span></button>`).join('')}</div>
        <p class="hint">Pick a resident, a place or a service, or tap any street, and a trail will lead you there.</p></div>`;
    mapEl.querySelector('.mid').prepend(mapCanvas);
    sizeMap();
    // zoom: wheel or pinch about the pointer, + and - buttons; pan: drag
    const zbox = document.createElement('div'); zbox.className = 'zoom';
    zbox.innerHTML = '<button data-z="1" aria-label="Zoom in">+</button><button data-z="-1" aria-label="Zoom out">−</button><button data-z="0" aria-label="Whole district">⤢</button>';
    mapEl.querySelector('.mid').appendChild(zbox);
    const legend = document.createElement('div'); legend.className = 'legend';
    // what the colours mean: the zones, and on a second row the kinds of road there are here, with their limits (roadclass.js)
    const have = new Set(world.roads.map((r) => roadClass(r.cls).kind));
    legend.innerHTML = '<div class="lg"><span><i style="background:#f6e7b8"></i>Homes</span><span><i style="background:rgba(228,111,79,.45)"></i>Shops and food</span><span><i style="background:rgba(42,157,148,.45)"></i>Civic and work</span><span><i style="background:#7fc4c4"></i>Park</span></div>'
      + `<div class="lg">${[...ROAD_KINDS].reverse().filter(([k]) => have.has(k)).map(([, label, col, lim]) => `<span><i style="background:${col};box-shadow:inset 0 0 0 1.5px #c4a46c"></i>${label.replace(/ and service lanes/, '')} <small>${lim}</small></span>`).join('')}<span><small>km/h</small></span></div>`;
    mapEl.querySelector('.mid').appendChild(legend);
    const zoomAt = (f, px = 450, py = 450) => { const bx = (px - 450) / view.z + view.cx, by = (py - 450) / view.z + view.cy; view.z *= f; clampView(); view.cx = bx - (px - 450) / view.z; view.cy = by - (py - 450) / view.z; clampView(); bubble.style.display = 'none'; drawBigMap(); };
    zbox.querySelectorAll('button').forEach((b) => { b.onclick = () => { const z = +b.dataset.z; if (z === 0) { view.z = 1; view.cx = view.cy = 450; bubble.style.display = 'none'; drawBigMap(); } else zoomAt(z > 0 ? 1.6 : 1 / 1.6); }; });
    const toCanvas = (e) => { const r = mapCanvas.getBoundingClientRect(); return [(((e.clientX - r.left) / r.width) * cw - OX) / MK, (((e.clientY - r.top) / r.height) * ch - OY) / MK]; };
    mapCanvas.onwheel = (e) => { e.preventDefault(); const [px, py] = toCanvas(e); zoomAt(Math.exp(-e.deltaY * 0.0022), px, py); };
    const ptrs = new Map(); let pinch0 = 0;
    mapCanvas.onpointerdown = (e) => { ptrs.set(e.pointerId, toCanvas(e)); panMoved = 0; mapCanvas.setPointerCapture(e.pointerId); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } };
    mapCanvas.onpointermove = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId), cur = toCanvas(e); ptrs.set(e.pointerId, cur);
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) zoomAt(d / pinch0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch0 = d; panMoved = 99; return; }
      const dx = cur[0] - prev[0], dy = cur[1] - prev[1]; panMoved += Math.abs(dx) + Math.abs(dy);
      if (view.z > 1 && panMoved > 6) { view.cx -= dx / view.z; view.cy -= dy / view.z; clampView(); bubble.style.display = 'none'; drawBigMap(); }
    };
    mapCanvas.onpointerup = mapCanvas.onpointercancel = (e) => { ptrs.delete(e.pointerId); pinch0 = 0; };
    drawBigMap();
    const bubble = mapEl.querySelector('.bubble');
    // a picked marker says how far away it is, and offers to take you there at once (quick travel)
    const showBubble = (x, z, text) => {
      const r = mapCanvas.getBoundingClientRect(), m = mapEl.querySelector('.mid').getBoundingClientRect();
      const [px, py] = toPx(x, z), me = getPlayer(), d = Math.hypot(x - me.x, z - me.z);
      const far = d >= 1000 ? `${(d / 1000).toFixed(1)} km away` : d < 8 ? 'You are here' : `${Math.round(d)} m away · about ${Math.max(1, Math.round(d / 80))} min on foot`;
      bubble.innerHTML = `<b>${String(text).replace(/[<>&]/g, '')}</b><small>${far}</small>${d >= 8 ? '<button class="qt">Quick travel</button>' : ''}`;
      bubble.style.display = 'block';
      bubble.style.left = `${r.left - m.left + ((px * MK + OX) / cw) * r.width}px`; bubble.style.top = `${r.top - m.top + ((py * MK + OY) / ch) * r.height}px`;
      const qt = bubble.querySelector('.qt');
      if (qt) qt.onclick = (e) => { e.stopPropagation(); close(); dispatchEvent(new CustomEvent('bw:jumpto', { detail: { x, z, name: text, quick: true } })); };
    };
    mapCanvas.onclick = (ev) => {
      const r = mapCanvas.getBoundingClientRect();
      if (panMoved > 6) return; // that was a drag, not a tap
      const [px, py] = toCanvas(ev); void r;
      const [wx, wz] = fromPx(px, py);
      const s = snapToStreet?.(wx, wz);
      if (!s || s.d > 25) { toast('Pick a point on or near a street.'); return; }
      selPlace = null; selRes = null;
      onRoute?.({ x: s.x, z: s.z }, 'your marker', true);
      setTimeout(() => { drawBigMap(); showBubble(s.x, s.z, 'Your marker'); }, 50);
    };
    const rs = mapEl.querySelector('.rsearch');
    if (rs) rs.oninput = () => { resQuery = rs.value; const pos = rs.selectionStart; openMap(); const n = mapEl.querySelector('.rsearch'); n?.focus(); n?.setSelectionRange(pos, pos); };
    const ra = mapEl.querySelector('.rall'); if (ra) ra.onclick = () => { resAll = !resAll; openMap(); };
    mapEl.querySelectorAll('.res button').forEach((b) => {
      b.onclick = () => {
        selRes = b.dataset.id; selPlace = null;
        mapEl.querySelectorAll('.res button').forEach((x) => x.classList.toggle('sel', x === b));
        drawBigMap();
        const p = world.plots.find((pl) => pl.b.id === selRes);
        if (p) { const f = world.frontOf([p.center.x, p.center.z]); onRoute?.({ x: f.x, z: f.z }, `${p.b.name.split(' ')[0]}'s plot`, true); setTimeout(() => { drawBigMap(); showBubble(p.center.x, p.center.z, p.b.name.split(' ')[0]); }, 50); }
      };
    });
    // players online: tap to walk to them, Jump to be there now
    const onl = (id) => onlineNow.players.find((q) => q.id === id);
    mapEl.querySelectorAll('.onl [data-o]').forEach((b) => { b.onclick = () => { const q = onl(b.dataset.o); if (!q) return; selPlace = null; selRes = null; onRoute?.({ x: q.x, z: q.z }, q.name, true); setTimeout(() => { drawBigMap(); showBubble(q.x, q.z, q.name); }, 50); }; });
    mapEl.querySelectorAll('.onl [data-j]').forEach((b) => { b.onclick = () => { const q = onl(b.dataset.j); if (!q) return; dispatchEvent(new CustomEvent('bw:jumpto', { detail: { x: q.x, z: q.z, name: q.name } })); close(); }; });
    mapEl.querySelectorAll('.places button').forEach((b) => {
      b.onclick = () => {
        const p = places.find((x) => x.id === b.dataset.p);
        selPlace = p.id; selRes = null;
        mapEl.querySelectorAll('.places button').forEach((x) => x.classList.toggle('sel', x === b));
        onRoute?.(p.at, p.name, true);
        setTimeout(() => { drawBigMap(); showBubble(p.at.x, p.at.z, p.name); }, 50);
      };
    });
    mapEl.querySelectorAll('.kinds button').forEach((b) => {
      b.onclick = () => {
        poiFilter = b.dataset.kind; selPlace = null; selRes = null;
        const me2 = getPlayer(), best = poisOf(poiFilter).sort((p1, p2) => Math.hypot(p1.x - me2.x, p1.z - me2.z) - Math.hypot(p2.x - me2.x, p2.z - me2.z))[0];
        mapEl.querySelectorAll('.kinds button').forEach((x) => x.classList.toggle('sel', x === b));
        if (best) { onRoute?.({ x: best.x, z: best.z }, best.name, true); setTimeout(() => { drawBigMap(); showBubble(best.x, best.z, best.name); }, 50); }
      };
    });
    show(mapEl, [['M', 'Close'], ['Click', 'Set a destination']]);
    if (focusResidents) mapEl.querySelector('.res button')?.focus();
  }

  // ---------- bag ----------
  // a scalloped tile, like the wardrobe ring
  const FLOWER = (() => { let d = ''; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2, r = 58 + Math.cos(a * 7) * 5; d += `${i ? 'L' : 'M'}${(66 + Math.cos(a) * r).toFixed(1)} ${(66 + Math.sin(a) * r).toFixed(1)}`; } return `<svg class="fl" viewBox="0 0 132 132"><path d="${d}Z"/></svg>`; })();
  let bagTab = 'gadgets', bagSel = 'laptop', bagResize = false;
  let bagTurn = 0, bagWheel = 0; // the bag carousel's last turn (for the slide-in) and the wheel's pause
  const BAG_TABS = [['gadgets', 'Gadgets'], ['wear', 'Wearables'], ['badges', 'Badges'], ['cards', 'Cards'], ['style', 'Wardrobe']];
  const tabsHTML = () => `<div class="tabs" role="tablist">${BAG_TABS.map(([k, nm]) => `<button role="tab" data-t="${k}" class="${bagTab === k ? 'on' : ''}" aria-selected="${bagTab === k}">${nm}</button>`).join('')}</div>`;
  // cards: membership and resident cards, and the Wi-Fi your laptop has joined (passes.js)
  // the leather card holder, its front pocket drawn over the cards
  const SLEEVE = `<svg class="sleeve" viewBox="0 0 320 170" preserveAspectRatio="none" aria-hidden="true">
    <path d="M10 26Q10 8 30 8h260q20 0 20 18v126q0 14-14 14H24q-14 0-14-14z" fill="#7a4a2c"/>
    <path d="M10 26Q10 8 30 8h260q20 0 20 18v14H10z" fill="#8f5a36"/>
    <path d="M22 30h276M22 154h276" stroke="#e8c79a" stroke-width="2" stroke-dasharray="6 5" opacity=".7"/>
    <path d="M20 22v132M300 22v132" stroke="#e8c79a" stroke-width="2" stroke-dasharray="6 5" opacity=".5"/>
    <rect x="128" y="64" width="64" height="30" rx="8" fill="#5e3820"/><circle cx="160" cy="79" r="6" fill="#d9b277"/></svg>`;
  const WIFI = (bars) => `<svg viewBox="0 0 24 20" aria-hidden="true">${[0, 1, 2].map((k) => `<path d="M${12 - 4 - k * 3.5} ${14 - k * 3.4}a${4 + k * 3.5} ${4 + k * 3.5} 0 0 1 ${8 + k * 7} 0" fill="none" stroke="${k < bars ? C.teal : '#d9cbb0'}" stroke-width="2.6" stroke-linecap="round"/>`).join('')}<circle cx="12" cy="16" r="2" fill="${bars ? C.teal : '#d9cbb0'}"/></svg>`;
  // cards: membership, resident and visitor cards in a holder; reputation and the Wi-Fi you have joined beside it (passes.js)
  function openCards() {
    const P = passesEngine(), list = P.cards(), known = P.known(), linked = P.link?.ssid;
    const rep = P.rep, ring = 2 * Math.PI * 34, esc = (t) => String(t).replace(/[<>&"]/g, '');
    bagEl.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(backdropSVG())}")`;
    bagEl.innerHTML = `${tabsHTML()}<div class="name">Cards</div>
      <div class="cw">
        <section class="cw-main">
          <div class="cw-stage">
            <button class="holder" aria-label="Open your card holder (${list.length} cards)"><div class="stack">${list.slice(0, 5).reverse().map((c, i) => `<div class="peek" style="--i:${i}">${P.cardHTML(c)}</div>`).join('')}</div>${SLEEVE}<span class="count">${list.length} card${list.length === 1 ? '' : 's'}</span></button>
            <div class="track" role="listbox" aria-label="Your cards" tabindex="0">${list.map((c, i) => `<div class="slot" role="option" style="--i:${i}">${P.cardHTML(c)}</div>`).join('')}</div>
          </div>
          <div class="cw-nav"><button class="pv" aria-label="Previous card">‹</button><div class="dots">${list.map(() => '<i></i>').join('')}</div><button class="nx" aria-label="Next card">›</button></div>
          <p class="cw-hint">Tap the holder to take your cards out</p>
        </section>
        <aside class="cw-side">
          <div class="bw-paper rep">
            <svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" fill="none" stroke="#eadfc6" stroke-width="10"/><circle cx="42" cy="42" r="34" fill="none" stroke="${rep < 30 ? C.coral : rep < 60 ? C.amber : C.teal}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(ring * rep) / 100} ${ring}" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle" font-family="Baloo 2, system-ui" font-weight="800" font-size="20" fill="${C.ink}">${rep}</text></svg>
            <div><b>${P.repLabel()}</b><p>Your reputation, out of 100. People and gatemen go by it.</p></div>
            <ul><li><i class="up">+</i>Pick up litter and fund street bins</li><li><i class="up">+</i>Knock and visit politely</li><li><i class="dn">−</i>Climbing an estate's walls</li></ul>
          </div>
          <div class="bw-paper wifi"><h4>Saved Wi-Fi <small>${Object.keys(known).length} network${Object.keys(known).length === 1 ? '' : 's'}</small></h4>
            ${Object.entries(known).map(([ssid, pass]) => `<div class="net">${WIFI(ssid === linked ? 3 : 2)}<span><b>${esc(ssid)}</b><small data-pw="${esc(pass)}">${ssid === linked ? 'Connected · ' : ''}••••••••</small></span><button data-show>Show</button></div>`).join('') || '<p class="empty">None yet. Join a network from your laptop at a desk; the password is on a notice board, or on your card.</p>'}
          </div>
        </aside>
      </div>
      <div class="acts"><button class="bw-chip cl"><b>I</b>Close</button></div>`;
    const cw = bagEl.querySelector('.cw'), holder = cw.querySelector('.holder'), track = cw.querySelector('.track'), slots = [...track.children], dots = [...cw.querySelectorAll('.dots i')], hint = cw.querySelector('.cw-hint');
    // the card in the middle of the carousel is the one you are looking at
    let at = 0;
    const focus = () => { const w = slots[0]?.getBoundingClientRect().width || 1; at = Math.max(0, Math.min(slots.length - 1, Math.round(track.scrollLeft / (w + 22)))); slots.forEach((el, i) => el.classList.toggle('on', i === at)); dots.forEach((el, i) => el.classList.toggle('on', i === at)); };
    const goTo = (i) => { const w = slots[0]?.getBoundingClientRect().width || 0; track.scrollTo({ left: Math.max(0, Math.min(slots.length - 1, i)) * (w + 22), behavior: 'smooth' }); };
    track.addEventListener('scroll', focus, { passive: true });
    track.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); track.scrollLeft += e.deltaY; } }, { passive: false });
    const setOpen = (on) => { cw.classList.toggle('open', on); holder.setAttribute('aria-label', on ? 'Put your cards away' : `Open your card holder (${list.length} cards)`); hint.textContent = on ? (innerWidth < 600 ? 'Swipe or use the arrows · tap the holder to put them away' : 'Swipe, scroll or use the arrows · tap the holder to put them away') : 'Tap the holder to take your cards out'; sfx(on ? 'open' : 'close'); if (on) { track.scrollLeft = 0; focus(); setTimeout(() => track.focus({ preventScroll: true }), 200); } };
    holder.onclick = () => setOpen(!cw.classList.contains('open'));
    cw.querySelector('.pv').onclick = () => goTo(at - 1); cw.querySelector('.nx').onclick = () => goTo(at + 1);
    dots.forEach((d, i) => { d.onclick = () => goTo(i); });
    track.onkeydown = (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); goTo(at + (e.key === 'ArrowRight' ? 1 : -1)); } };
    // a saved password stays hidden until you ask
    cw.querySelectorAll('[data-show]').forEach((b) => { b.onclick = () => { const sm = b.parentElement.querySelector('small'), shown = b.textContent === 'Hide'; sm.textContent = `${sm.textContent.startsWith('Connected') ? 'Connected · ' : ''}${shown ? '••••••••' : sm.dataset.pw}`; b.textContent = shown ? 'Show' : 'Hide'; }; });
    bagEl.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => { bagTab = b.dataset.t; openBag(); }; });
    bagEl.querySelector('.cl').onclick = close;
    show(bagEl, null);
  }
  function openBag() {
    if (bagTab === 'style') { bagTab = 'gadgets'; close(); dispatchEvent(new Event('bw:wardrobe')); return; }
    if (bagTab === 'cards') return openCards();
    const list = ITEMS.filter((i) => i.tab === bagTab);
    if (!list.find((i) => i.id === bagSel)) bagSel = list[0].id;
    const it = ITEMS.find((i) => i.id === bagSel);
    const unbought = it.price && !owns(it.id); if (unbought) it.locked = true; else if (it.price) it.locked = false;
    const isOn = equipped.includes(it.id);
    const n = list.length, rx = 300, ry = 238;
    // a carousel when the tab holds more than four (Elvis, 10 October 2026): four at a time, on the diagonals round you
    const PER = 4, pages = Math.ceil(n / PER), idx = list.findIndex((i) => i.id === bagSel), page = Math.floor(idx / PER);
    const shown = pages > 1 ? list.slice(page * PER, page * PER + PER) : list, dx = bagTurn * 70; bagTurn = 0;
    const spot = (k) => { const a = pages > 1 ? -Math.PI * 3 / 4 + k * Math.PI / 2 : -Math.PI / 2 + (k / n) * Math.PI * 2; return `left:${380 + Math.cos(a) * rx}px;top:${320 + Math.sin(a) * ry}px`; };
    const CHEV = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="${d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const verb = unbought ? `Buy at the gadget shop · ${fmt(it.price)}` : it.locked ? 'Not earned yet' : it.always ? 'Always with you' : isOn ? (it.wear ? 'Take off' : 'Put back') : (it.wear ? 'Wear' : 'Carry');
    bagEl.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(backdropSVG())}")`;
    bagEl.innerHTML = `
      ${tabsHTML()}
      <div class="name">${it.name}</div>
      <div class="stage"><div class="disc"></div><div class="fig">${figureSVG(me.look, equipped)}</div>
        ${pages > 1 ? `<button class="pgb l" aria-label="Previous ${PER}" ${page === 0 ? 'disabled' : ''}>${CHEV(-1)}</button><button class="pgb r" aria-label="Next ${PER}" ${page === pages - 1 ? 'disabled' : ''}>${CHEV(1)}</button><div class="pgd" role="tablist" aria-label="Pages">${Array.from({ length: pages }, (_, q) => `<button class="${q === page ? 'on' : ''}" data-p="${q}" aria-label="Page ${q + 1} of ${pages}"></button>`).join('')}<span>${page * PER + 1 === Math.min(n, page * PER + PER) ? n : `${page * PER + 1}–${Math.min(n, page * PER + PER)}`} of ${n}</span></div>` : ''}
        ${shown.map((i, k) => { return `<button class="it ${i.id === bagSel ? 'sel' : ''} ${i.locked ? 'locked' : ''} ${pages > 1 ? 'pg' : ''}" data-i="${i.id}" aria-label="${i.name}" style="${spot(k)};--k:${k};--dx:${dx}px">${FLOWER}<svg class="a" viewBox="0 0 64 64" width="76" height="76">${art(i.id).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>${equipped.includes(i.id) ? '<span class="eq">✓</span>' : ''}</button>`; }).join('')}</div>
      <div class="card bw-paper"><span class="tag">${it.tag}</span><p>${it.desc}</p></div>
      <div class="acts"><button class="bw-chip act" ${it.locked || it.always ? 'disabled' : ''}><b>Enter</b>${verb}</button><button class="bw-chip cl"><b>I</b>Close</button></div>`;
    const fit = () => { const k = Math.min(1, (innerWidth - 20) / 780, (innerHeight - 170) / 640); bagEl.querySelector('.stage')?.style.setProperty('--k', String(Math.max(0.42, k))); };
    fit(); if (!bagResize) { bagResize = true; addEventListener("resize", () => { if (open === bagEl) bagEl.querySelector(".stage")?.style.setProperty("--k", String(Math.max(0.42, Math.min(1, (innerWidth - 20) / 780, (innerHeight - 170) / 640)))); }); }
    bagEl.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => { bagTab = b.dataset.t; openBag(); }; });
    bagEl.querySelectorAll('.it').forEach((b) => { b.onclick = () => { if (bagSel === b.dataset.i) bagEl.querySelector('.act:not([disabled])')?.click(); else { bagSel = b.dataset.i; openBag(); bagEl.querySelector(`.it[data-i="${bagSel}"]`)?.focus(); } }; });
    bagEl.querySelector('.cl').onclick = close;
    // turning the carousel: the first of the next four is selected, and the four slide in from that side
    const turn = (d, to) => { const q = to ?? page + d; if (pages < 2 || q < 0 || q >= pages || q === page) return; bagTurn = q > page ? 1 : -1; bagSel = list[q * PER].id; openBag(); (bagEl.querySelector(`.pgb.${q > page ? 'r' : 'l'}:not([disabled])`) || bagEl.querySelector('.it.sel'))?.focus(); };
    if (pages > 1) {
      bagEl.querySelector('.pgb.l').onclick = () => turn(-1); bagEl.querySelector('.pgb.r').onclick = () => turn(1);
      bagEl.querySelectorAll('.pgd [data-p]').forEach((b) => { b.onclick = () => turn(0, +b.dataset.p); });
      const stage = bagEl.querySelector('.stage');
      stage.onwheel = (e) => { if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 20 || bagWheel > performance.now()) return; bagWheel = performance.now() + 350; turn((e.deltaY || e.deltaX) > 0 ? 1 : -1); };
      let sx = null; stage.onpointerdown = (e) => { sx = e.clientX; }; stage.onpointerup = (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 50) turn(e.clientX < sx ? 1 : -1); sx = null; };
    }
    bagEl.onkeydown = (e) => { if (open !== bagEl || bagTab === 'cards' || pages < 2) return; if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); turn(e.key === 'ArrowRight' ? 1 : -1); } };
    const act = bagEl.querySelector('.act:not([disabled])');
    if (act) act.onclick = () => {
      const on = !equipped.includes(it.id);
      equipped = on ? [...equipped, it.id] : equipped.filter((x) => x !== it.id);
      store.set('bw-bag-equipped', equipped);
      onEquip?.(it.id, on);
      openBag();
      bagEl.querySelector(`.it[data-i="${it.id}"]`)?.focus();
    };
    show(bagEl, null);
  }

  // ---------- first-visit guide ----------
  const touch = matchMedia('(pointer: coarse)').matches;
  function showGuide() {
    guide.innerHTML = touch ? `
      <div class="row">
        <div class="g"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="44"/><circle cx="60" cy="60" r="16"/></svg>MOVE</div>
        <div class="g"><svg width="120" height="120" viewBox="0 0 120 120"><path d="M40 70V40a8 8 0 0 1 16 0v26M56 50a8 8 0 0 1 16 0v14M72 56a8 8 0 0 1 16 0v18c0 18-10 30-28 30S34 92 30 80l-6-14a7 7 0 0 1 12-6l4 6"/><path d="M14 30h20M86 30h20M20 24l-6 6 6 6M100 24l6 6-6 6"/></svg>DRAG TO LOOK</div>
        <div class="g"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="56" r="10"/><circle cx="60" cy="56" r="24" stroke-dasharray="6 8"/><path d="M60 90v14"/></svg>TAP TO WALK</div>
      </div><div class="skip">TAP ANYWHERE TO START</div>` : `
      <div class="row">
        <div class="g"><div class="keys"><span></span><kbd>W</kbd><span></span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>MOVE</div>
        <div class="g"><svg width="110" height="130" viewBox="0 0 110 130"><rect x="18" y="10" width="74" height="110" rx="37"/><path d="M55 10v40M18 50h74"/><path d="M4 70h10M96 70h10M8 64l-6 6 6 6M102 64l6 6-6 6"/></svg>DRAG TO LOOK</div>
        <div class="g"><kbd>E</kbd>INTERACT</div>
        <div class="g"><div style="display:flex;gap:8px"><kbd style="min-width:84px">Shift</kbd><kbd style="min-width:110px">Space</kbd></div>RUN · JUMP</div>
        <div class="g"><kbd>V</kbd>CAMERA</div>
        <div class="or">OR</div>
        <div class="g"><div style="display:flex;gap:8px"><kbd style="min-width:72px">Tab</kbd><kbd>M</kbd><kbd>I</kbd></div>PHONE · MAP · BAG</div>
      </div><div class="skip">PRESS ANY KEY TO START</div>`;
    guide.classList.add('on');
    const done = () => {
      guide.classList.remove('on');
      store.set('bw-guide-seen', 1);
      removeEventListener('keydown', done, true); guide.removeEventListener('pointerdown', done);
    };
    setTimeout(() => { addEventListener('keydown', done, true); guide.addEventListener('pointerdown', done); }, 400);
    setTimeout(done, 12000);
  }
  if (!store.get('bw-guide-seen', 0) && !new URLSearchParams(location.search).has('still')) setTimeout(showGuide, 1800);

  // keys from the street: returns true when a menu used the key
  function key(k) {
    if (k === 'tab') { open === phone ? close() : openPhone(); return true; }
    if (open === phone && ['arrowright', 'arrowleft', 'arrowup', 'arrowdown'].includes(k)) { phoneArrow(k); return true; }
    if (k === 'm') { open === mapEl ? close() : openMap(); return true; }
    if (k === 'i') { open === bagEl ? close() : openBag(); return true; }
    if ((open === setEl || open === walEl) && k !== 'escape') return true;
    if (k === 'escape' && open) { close(); return true; }
    return !!open && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'q'].includes(k);
  }

  function dispose() { root.remove(); style.remove(); }
  // ---------- settings: sound first ----------
  const audio = audioEngine();
  // what each graphics tier gives you, and what this machine looks like to the browser
  const GFX_NOTE = {
    low: 'Fastest. A softer picture, a few lamps at night, no glow. For older laptops and phones.',
    medium: 'A sharper picture with smooth edges, more lamps and the evening glow.',
    high: 'Sun shadows that move with the time of day, soft shading in corners and under roofs, crisp textures at a slant.',
    ultra: 'Everything at its best: full sharpness, longer and softer shadows, the sky reflected in glass and paint, more of the street in the distance. Needs a strong graphics chip and runs slower.',
  };
  const fpsOn = () => { try { return localStorage.getItem('bw-fps') === '1'; } catch { return false; } };
  function gfxNote(choice) {
    const gx = window.__bw?.graphics, i = gx?.info || {};
    const tier = choice === 'auto' ? gx?.auto?.() || 'high' : choice;
    const dev = [i.gpu, i.mem ? `${i.mem >= 8 ? `${i.mem} GB or more` : `about ${i.mem} GB`} of memory` : '', i.cores ? `${i.cores} cores` : ''].filter(Boolean).join(', ');
    return `${GFX_NOTE[tier]}${dev ? `<br>This device: ${dev}.` : ''} Higher settings look better and run slower; the graphics chip matters most, then memory.`;
  }
  // the Settings redesign: the same controls, re-laid as a list of sections and cards; the last section is remembered
  function restyleSettings() {
    const title = setEl.querySelector('h3'), kids = [...setEl.children].filter((e) => e !== title);
    const sections = []; let cur = null;
    kids.forEach((e) => { if (e.matches('h4.sec')) { cur = { name: e.textContent.trim(), nodes: [e] }; sections.push(cur); } else if (cur) cur.nodes.push(e); });
    if (!sections.length) return;
    setEl.classList.add('v2'); setEl.innerHTML = '';
    const header = document.createElement('header'); header.append(title); const xs = document.createElement('button'); xs.className = 'xs'; xs.setAttribute('aria-label', 'Close settings'); xs.textContent = '✕'; xs.onclick = close; header.append(xs);
    const nav = document.createElement('nav'), pane = document.createElement('div'); pane.className = 'pane';
    let want = ''; try { want = sessionStorage.getItem('bw-set-tab') || ''; } catch { /* */ }
    sections.forEach((S, i) => {
      const sec = document.createElement('section'); let grp = null;
      S.nodes.forEach((n) => { if (n.matches('.sw, .vol')) { if (!grp) { grp = document.createElement('div'); grp.className = 'grp'; sec.append(grp); } grp.append(n); } else { grp = null; sec.append(n); } });
      const b = document.createElement('button'); b.textContent = S.name;
      const pick = () => { nav.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); pane.querySelectorAll('section').forEach((x) => x.classList.toggle('on', x === sec)); pane.scrollTop = 0; try { sessionStorage.setItem('bw-set-tab', S.name); } catch { /* */ } };
      b.onclick = pick; nav.append(b); pane.append(sec);
      if (S.name === want || (!want && i === 0)) setTimeout(pick, 0);
    });
    if (want && !sections.some((S) => S.name === want)) setTimeout(() => nav.querySelector('button')?.click(), 0);
    setEl.append(header, nav, pane);
    // choices as segmented buttons in place of the dropdowns (the dropdown stays, hidden, and still does the work)
    setEl.querySelectorAll('select').forEach((sel) => {
      const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'radiogroup');
      [...sel.options].forEach((o) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = o.textContent.replace(/ \(.*\)$/, ''); b.title = o.textContent; b.classList.toggle('on', sel.value === o.value); b.onclick = () => { sel.value = o.value; sel.dispatchEvent(new Event('change')); seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }; seg.append(b); });
      sel.style.display = 'none'; sel.after(seg);
    });
  }
  function openSettings() {
    const st = audio.settings, inp = window.__bwInput, gx = window.__bw?.graphics;
    const row = (k, name, sub) => `<label class="sw"><span><b>${name}</b><small>${sub}</small></span><input type="checkbox" data-k="${k}" ${st[k] ? 'checked' : ''}><i></i></label>`;
    setEl.innerHTML = `<h3>Settings</h3>
      <h4 class="sec" style="margin-top:4px">Graphics</h4>
      <label class="vol"><b>Quality</b><select data-gfx>${['auto', 'low', 'medium', 'high', 'ultra'].map((k) => `<option value="${k}">${k === 'auto' ? `Auto (${LABEL[gx?.auto?.() || 'high']} on this device)` : LABEL[k]}</option>`).join('')}</select></label>
      <p class="note" data-gfxnote></p>
      <label class="sw"><span><b>Show frame rate</b><small>A small counter at the top of the screen, to see what each setting costs.</small></span><input type="checkbox" data-fps ${fpsOn() ? 'checked' : ''}><i></i></label>
      <label class="sw"><span><b>Earth and yards (Greenrey)</b><small>Big open land is laterite, yards and building plots; grass stays between buildings and in parks. Off brings back the open grass. The street reloads.</small></span><input type="checkbox" data-greenrey ${greenreyOn() ? 'checked' : ''}><i></i></label>
      <h4 class="sec">Sound</h4>
      ${row('music', 'Music', 'A highlife loop made as you play. N turns it on or off.')}
      ${row('ambience', 'City sounds', 'Traffic hum, birds, rain, horns, crickets at night.')}
      ${row('sfx', 'Sound effects', 'Footsteps, doors, taps and chimes.')}
      <button class="bw-chip" data-sp style="margin:6px 0 4px"><b>♪</b>${window.__bw?.look?.spotify?.connected ? 'Disconnect Spotify' : 'Show what I play on Spotify'}</button>
      <p class="note">Your Spotify keeps playing in Spotify; the game only shows the track, on your screen and to people nearby.</p>
      ${row('creator', 'Creator mode', 'Safe to stream and post: only the game\'s own music plays, and Spotify now-playing is hidden. Everything in Builders World\'s soundtrack is made in your browser, so nothing can be claimed.')}
      <label class="vol"><b>Volume</b><input type="range" min="0" max="1" step="0.05" value="${st.volume}"></label>
      <p class="note">Every sound is made in your browser as you play. No recordings, so nothing to license.</p>
      <h4 class="sec">Public profile</h4>
      <p class="note">What other builders see when they profile you (P). Usernames only; leave a box empty to keep it private.</p>
      <label class="vol"><b>Role</b><input type="text" data-pub="role" maxlength="40" placeholder="Product designer, backend dev..."></label>
      <label class="vol"><b>X username</b><input type="text" data-pub="x" maxlength="40" placeholder="without the @"></label>
      <label class="vol"><b>LinkedIn</b><input type="text" data-pub="linkedin" maxlength="40" placeholder="the part after linkedin.com/in/"></label>
      <label class="vol"><b>Dribbble</b><input type="text" data-pub="dribbble" maxlength="40" placeholder="username"></label>
      <label class="vol"><b>Behance</b><input type="text" data-pub="behance" maxlength="40" placeholder="username"></label>
      <label class="sw"><span><b>Show my socials and design work</b><small>X, LinkedIn, Dribbble, Behance.</small></span><input type="checkbox" data-pub="showSocials"><i></i></label>
      <label class="sw"><span><b>Show my commits this year</b><small>From your linked GitHub.</small></span><input type="checkbox" data-pub="showCommits"><i></i></label>
      <h4 class="sec">Controls</h4>
      <label class="vol"><b>Touch controls</b><select data-in="touch"><option value="auto">Automatic</option><option value="on">On</option><option value="off">Off</option></select></label>
      <label class="sw"><span><b>Invert camera up and down</b><small>For the right stick.</small></span><input type="checkbox" data-in="invertY" ${inp?.settings.invertY ? 'checked' : ''}><i></i></label>
      <label class="sw"><span><b>Camera follows you</b><small>As you walk, and as you turn with A and D, the camera swings round behind you, as in GTA V. Dragging or the right stick still looks around; the camera waits a moment after you do.</small></span><input type="checkbox" data-in="camFollow" ${inp?.settings.camFollow ? 'checked' : ''}><i></i></label>
      <label class="vol"><b>Camera speed</b><input type="range" data-in="sensitivity" min="0.4" max="2" step="0.1" value="${inp?.settings.sensitivity ?? 1}"></label>
      <p class="note">${inp?.connected ? `Connected: <b>${inp.connected.replace(/\(.*\)/, '').trim()}</b>` : 'Connect a PlayStation 4 or 5, or an Xbox controller, by USB or Bluetooth and press any button.'}</p>
      <table class="pad">${PAD_MAP.map((m) => `<tr><td><kbd>${inp ? inp.padLabel(m.i) : m.i}</kbd></td><td>${m.what}</td></tr>`).join('')}<tr><td><kbd>Left stick</kbd></td><td>Walk (push all the way to run)</td></tr><tr><td><kbd>Right stick</kbd></td><td>Look around</td></tr></table>
      <button class="bw-chip done"><b>Esc</b>Done</button>`;
    const gsel = setEl.querySelector('select[data-gfx]'), gnote = setEl.querySelector('[data-gfxnote]');
    gsel.value = gx?.choice || 'auto'; gnote.innerHTML = gfxNote(gsel.value);
    gsel.onchange = () => { dispatchEvent(new CustomEvent('bw:graphics', { detail: gsel.value })); gnote.innerHTML = gfxNote(gsel.value); };
    setEl.querySelector('[data-fps]').onchange = (e) => dispatchEvent(new CustomEvent('bw:fps', { detail: e.target.checked }));
    setEl.querySelector('[data-greenrey]').onchange = (e) => { try { localStorage.setItem('bw-greenrey', e.target.checked ? '1' : '0'); } catch { /* */ } location.reload(); };
    setEl.querySelectorAll('input[type=checkbox][data-k]').forEach((c) => { c.onchange = () => { audio.wake(); audio.set(c.dataset.k, c.checked); }; });
    setEl.querySelector('input[type=range]:not([data-in])').oninput = (e) => { audio.wake(); audio.set('volume', +e.target.value); };
    const tsel = setEl.querySelector('select[data-in]'); if (tsel) { tsel.value = inp?.settings.touch ?? 'auto'; tsel.onchange = () => inp?.set('touch', tsel.value); }
    setEl.querySelectorAll('[data-in]:not(select)').forEach((el) => { el.oninput = el.onchange = () => inp?.set(el.dataset.in, el.type === 'checkbox' ? el.checked : +el.value); });
    // public profile, kept on this device and shared with your presence (online.js)
    const pub = store.get('bw-public', {});
    setEl.querySelectorAll('[data-pub]').forEach((el) => {
      const k = el.dataset.pub;
      if (el.type === 'checkbox') el.checked = !!pub[k]; else el.value = pub[k] || '';
      el.oninput = el.onchange = () => { pub[k] = el.type === 'checkbox' ? el.checked : el.value.trim(); store.set('bw-public', pub); };
    });
    setEl.querySelector('[data-sp]').onclick = () => { close(); dispatchEvent(new Event('bw:spotify')); };
    setEl.querySelector('.done').onclick = close;
    restyleSettings();
    show(setEl, null);
    setEl.querySelector('input')?.focus();
  }

  // ---------- wallet (and the ATM, which is the same wallet on a machine) ----------
  const wallet = walletEngine();
  // the wallet: drawn open with your cards and cash; click it for the overview on a square sheet beside it
  // the wallet: tap the cards (left) to take them out in a column, tap the cash (right) to count it out
  // in notes and coins; the overview (balance, GitHub, spending) is a tap away from either
  function openWallet({ atm = false, panel = atm, view = atm ? 'overview' : 'cards' } = {}) {
    const w = wallet;
    const hist = w.history.map((h) => `<li><span>${h.what}</span><b${h.earn ? ' class="in"' : ''}>${h.earn ? '+' : '−'}${effortsMark(12)}${fmt(h.amount)}</b></li>`).join('') || '<li class="none">Nothing spent or earned yet.</li>';
    let cards = [], P = null; try { P = passesEngine(); cards = P.cards(); } catch { /* */ }
    const bal = w.balance(), money = breakdown(bal), who = (() => { try { return loadProfile()?.name || ''; } catch { return ''; } })();
    const bank = `<div class="bw-card" style="--c1:#3fb6a8;--c2:#1f6f68;--ink:#06231f">${cardArt('lagos')}<div class="org">YABA BUILDERS BANK</div><div class="dist">Debit card</div><div class="kind">EFFORTS ACCOUNT</div><span class="chip"></span>
      <div class="nm">${who || 'Builder'}</div><div class="role">Balance ${fmt(bal)} Efforts</div><div class="no">•••• •••• •••• 4728</div></div>`;
    walEl.classList.toggle('atm', atm);
    walEl.classList.toggle('panel', !!panel);
    walEl.dataset.view = view;
    walEl.innerHTML = `<div class="wl">${walletSVG({ cards, balance: fmt(bal), mark: effortsMark(20, C.ink) })}
        <button class="half l" aria-label="Your cards (${cards.length + 1})"></button><button class="half r" aria-label="Your cash: ${fmt(bal)} Efforts"></button>
        <span class="tip">Cards on the left · cash on the right</span></div>
      <div class="wp"><div class="in">
        <div class="col cards"><h3>Cards<small>${cards.length + 1} in your wallet · tap the cards again to put them back</small></h3>${bank}${cards.map((c) => P.cardHTML(c)).join('')}</div>
        <div class="col money"><h3>Cash<small>What ${fmt(bal)} Efforts looks like in your wallet</small></h3>
          <div class="total">${effortsMark(28)}<b>${fmt(bal)}</b><small>${money.reduce((a, d) => a + d.n, 0)} notes and coins</small></div>
          ${money.map((d, i) => `<div class="stack" style="animation-delay:${0.06 * i}s">${moneySVG(d)}<span><b>${d.n} × ${d.kind === 'bundle' ? '100,000' : fmt(d.v)}</b><small>${d.kind === 'bundle' ? d.sub : d.name}</small></span><span class="sum">${fmt(d.n * d.v)}</span></div>`).join('') || '<p class="colhint">Empty for now. Push a commit: every one is 1,000 Efforts.</p>'}
          <button class="bw-chip ovb" style="align-self:flex-start"><b>→</b>Balance and spending</button></div>
        <div class="ov">
        <h3>${atm ? 'ATM' : 'Wallet'}<small>${atm ? 'Yaba Builders Bank' : 'Efforts, earned by shipping'}</small></h3>
        <div class="bal">${effortsMark(32)}<b>${fmt(bal)}</b><small>${cards.length + 1} card${cards.length ? 's' : ''}<br>and cash</small></div>
        <p class="how">${w.demo ? `Demo balance: ${w.commits} commits. <a href="${w.signInUrl()}">Sign in with GitHub</a> and every commit you push is <span style="white-space:nowrap">${effortsMark(11)}1,000</span>.` : w.counted ? `${fmt(w.commits)} ${w.source === 'contributions' ? 'contributions' : 'commits'} in the last year on GitHub as <b>@${w.handle}</b>, at <span style="white-space:nowrap">${effortsMark(11)}1,000</span> each.` : `Counting your commits on GitHub as <b>@${w.handle}</b>…`}</p>
        ${w.demo ? '' : '<form class="gh"><button class="bw-chip"><b>↵</b>Count again</button></form>'}
        ${w.status ? `<p class="st">${w.status}</p>` : ''}
        <h4>Recent</h4><ul>${hist}</ul>
        <div class="row"><button class="bw-chip back"><b>←</b>Wallet</button><button class="bw-chip done"><b>Esc</b>Done</button></div></div>
      </div></div>`;
    const halves = { cards: walEl.querySelector('.half.l'), money: walEl.querySelector('.half.r') };
    const mark = () => { Object.entries(halves).forEach(([k, b]) => b.classList.toggle('on', walEl.classList.contains('panel') && walEl.dataset.view === k)); };
    // tapping a half opens its column, tapping it again puts it away
    const choose = (v) => {
      const same = walEl.classList.contains('panel') && walEl.dataset.view === v;
      if (same) { walEl.classList.remove('panel'); sfx('close'); }
      else { walEl.dataset.view = v; walEl.classList.add('panel'); sfx('open'); const col = walEl.querySelector(`.col.${v}`); if (col) { col.scrollTop = 0; col.querySelectorAll('.bw-card, .stack').forEach((el, i) => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; el.style.animationDelay = `${0.07 * i}s`; }); } }
      mark();
    };
    halves.cards.onclick = () => choose('cards'); halves.money.onclick = () => choose('money');
    walEl.querySelector('.ovb').onclick = () => { walEl.dataset.view = 'overview'; mark(); };
    walEl.querySelector('.back').onclick = () => { walEl.classList.remove('panel'); mark(); halves.cards.focus(); };
    // the arrow keys: left for the cards, right for the cash
    walEl.onkeydown = (e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); choose('cards'); } if (e.key === 'ArrowRight') { e.preventDefault(); choose('money'); } };
    const gh = walEl.querySelector('.gh'); if (gh) gh.onsubmit = async (e) => { e.preventDefault(); await w.link(); openWallet({ atm, panel: true, view: 'overview' }); };
    walEl.querySelector('.done').onclick = close;
    // a click on the empty space round the wallet puts it away
    walEl.onclick = (e) => { if (e.target === walEl) close(); };
    mark();
    show(walEl, null);
    // focus on the wallet itself (arrow keys work at once) without lighting up either half
    walEl.tabIndex = -1; walEl.style.outline = 'none'; walEl.focus({ preventScroll: true });
  }
  wallet.onChange(() => { if (open === walEl) openWallet({ atm: walEl.classList.contains('atm'), panel: walEl.classList.contains('panel'), view: walEl.dataset.view }); });

  return { key, close, isOpen: () => !!open, openPhone, openMap, openBag, openSettings, openWallet, showGuide, dispose };
}
