// games.js
// Gentle, non-overstimulating interactions. Each factory takes a container and
// options and returns { done: Promise, stop() }. They avoid score, failure,
// timers-in-your-face, and harsh motion. Everything respects reduced motion.
//
// The breathing pacer is shared by every "breath" technique; the small games
// are used both standalone and as the "occupy the mind" slot in a session.

// Breathing patterns: sequences of phases {label, seconds, to} where `to` is
// the target scale of the orb (1 = small/exhaled, 2.4 = full/inhaled).
const PATTERNS = {
  sigh: [
    { label: 'Breathe in', seconds: 1.6, to: 1.9 },
    { label: 'Sip a little more in', seconds: 1.0, to: 2.4 },
    { label: 'Long slow breath out…', seconds: 5.0, to: 1.0 },
    { label: 'Rest', seconds: 1.0, to: 1.0 },
  ],
  box: [
    { label: 'Breathe in', seconds: 4, to: 2.4 },
    { label: 'Hold', seconds: 4, to: 2.4 },
    { label: 'Breathe out', seconds: 4, to: 1.0 },
    { label: 'Hold', seconds: 4, to: 1.0 },
  ],
  belly: [
    { label: 'Fill your tummy up', seconds: 3.5, to: 2.4 },
    { label: 'Let it all out', seconds: 4.5, to: 1.0 },
  ],
  flowercandle: [
    { label: '🌸 Smell the flower', seconds: 3.5, to: 2.4 },
    { label: '🕯️ Blow out the candle', seconds: 4.5, to: 1.0 },
  ],
};

// ---------------------------------------------------------------------------
// Breathing pacer — a soft orb that grows and shrinks with the breath.
// ---------------------------------------------------------------------------
export function breathePacer(container, { pattern = 'sigh', cycles = 8, reducedMotion = false } = {}) {
  const phases = PATTERNS[pattern] || PATTERNS.sigh;
  const el = document.createElement('div');
  el.className = 'pacer';
  el.innerHTML = `
    <div class="pacer-stage">
      <div class="pacer-orb" aria-hidden="true"></div>
    </div>
    <p class="pacer-label" role="status" aria-live="polite">Get comfortable…</p>
    <p class="pacer-count muted"></p>`;
  container.appendChild(el);

  const orb = el.querySelector('.pacer-orb');
  const label = el.querySelector('.pacer-label');
  const count = el.querySelector('.pacer-count');

  let stopped = false;
  let resolveDone;
  const done = new Promise((res) => (resolveDone = res));
  const timers = [];
  const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));

  async function run() {
    await wait(800);
    for (let c = 0; c < cycles && !stopped; c++) {
      count.textContent = `Breath ${c + 1} of ${cycles}`;
      for (const ph of phases) {
        if (stopped) break;
        label.textContent = ph.label;
        if (reducedMotion) {
          orb.style.transition = 'none';
        } else {
          orb.style.transition = `transform ${ph.seconds}s cubic-bezier(.37,0,.63,1), background ${ph.seconds}s ease`;
        }
        orb.style.transform = `scale(${ph.to})`;
        orb.style.background = ph.to > 1.6
          ? 'radial-gradient(circle, var(--orb-in) 0%, transparent 72%)'
          : 'radial-gradient(circle, var(--orb-out) 0%, transparent 72%)';
        await wait(ph.seconds * 1000);
      }
    }
    if (!stopped) {
      label.textContent = 'Beautiful.';
      count.textContent = '';
      await wait(600);
      resolveDone();
    }
  }
  run();

  return {
    done,
    stop() {
      stopped = true;
      timers.forEach(clearTimeout);
      resolveDone();
    },
  };
}

// ---------------------------------------------------------------------------
// Ripples — touch the still water, watch the rings spread and fade. Also used
// for "bubble breaths". Purely calming; there is nothing to win.
// ---------------------------------------------------------------------------
export function ripples(container, { durationSec = 120, reducedMotion = false } = {}) {
  const el = document.createElement('div');
  el.className = 'ripples';
  el.innerHTML = `<p class="game-hint muted">Touch the water. Let each ring fade before the next.</p>
    <div class="ripple-pool" tabindex="0" role="button" aria-label="Touch to make a ripple"></div>`;
  container.appendChild(el);
  const pool = el.querySelector('.ripple-pool');

  function spawn(x, y) {
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    if (reducedMotion) r.style.animationDuration = '1.2s';
    pool.appendChild(r);
    setTimeout(() => r.remove(), 3200);
  }
  function at(e) {
    const rect = pool.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    spawn(p.clientX - rect.left, p.clientY - rect.top);
  }
  pool.addEventListener('pointerdown', at);
  pool.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      spawn(pool.clientWidth / 2, pool.clientHeight / 2);
    }
  });

  return timedGame(el, durationSec, () => {
    pool.removeEventListener('pointerdown', at);
  });
}

// ---------------------------------------------------------------------------
// Gentle pairs — a tiny, timerless memory match with soft nature symbols.
// ---------------------------------------------------------------------------
export function match(container, { durationSec = 150, reducedMotion = false, symbols } = {}) {
  const set = (symbols || ['🌙', '🍃', '🌊', '⭐', '🌸', '☁️']).slice(0, 6);
  const deck = shuffle([...set, ...set]);
  const el = document.createElement('div');
  el.className = 'match';
  el.innerHTML = `<p class="game-hint muted">Find the pairs. No timer — take all the time you like.</p>
    <div class="match-grid"></div>
    <p class="match-status muted" role="status" aria-live="polite"></p>`;
  container.appendChild(el);
  const grid = el.querySelector('.match-grid');
  const status = el.querySelector('.match-status');

  let first = null, lock = false, found = 0;
  deck.forEach((sym, i) => {
    const card = document.createElement('button');
    card.className = 'match-card';
    card.type = 'button';
    card.setAttribute('aria-label', 'card');
    card.dataset.sym = sym;
    card.innerHTML = `<span class="face">${sym}</span>`;
    card.addEventListener('click', () => flip(card));
    grid.appendChild(card);
  });

  function flip(card) {
    if (lock || card.classList.contains('open') || card.classList.contains('done')) return;
    card.classList.add('open');
    if (!first) { first = card; return; }
    if (card.dataset.sym === first.dataset.sym) {
      card.classList.add('done'); first.classList.add('done');
      first = null; found += 1;
      status.textContent = found === set.length ? 'All matched. Lovely and calm. 🌿' : 'Nice.';
    } else {
      lock = true;
      const a = card, b = first; first = null;
      setTimeout(() => {
        a.classList.remove('open'); b.classList.remove('open'); lock = false;
      }, reducedMotion ? 500 : 850);
    }
  }

  return timedGame(el, durationSec);
}

// ---------------------------------------------------------------------------
// Star breathing — trace the star; breathe in going up a point, out coming
// down. Simple enough for a young child, guided by the moving glow.
// ---------------------------------------------------------------------------
export function starBreath(container, { durationSec = 90, reducedMotion = false } = {}) {
  const el = document.createElement('div');
  el.className = 'starbreath';
  el.innerHTML = `
    <p class="game-hint muted">Trace the star with your finger. Breathe in up, out down.</p>
    <svg viewBox="0 0 200 200" class="star-svg" aria-hidden="true">
      <polygon class="star-line" points="100,15 128,72 190,72 140,110 160,175 100,135 40,175 60,110 10,72 72,72"/>
      <circle class="star-dot" r="9" cx="100" cy="15"/>
    </svg>
    <p class="pacer-label" role="status" aria-live="polite">Ready…</p>`;
  container.appendChild(el);
  const dot = el.querySelector('.star-dot');
  const label = el.querySelector('.pacer-label');
  const pts = [[100,15],[128,72],[190,72],[140,110],[160,175],[100,135],[40,175],[60,110],[10,72],[72,72]];

  let stopped = false, i = 0;
  const timers = [];
  const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));
  let resolveDone; const done = new Promise((r) => (resolveDone = r));

  async function loop() {
    await wait(700);
    const cycles = Math.max(4, Math.round(durationSec / 10));
    for (let c = 0; c < cycles && !stopped; c++) {
      for (let k = 0; k < pts.length && !stopped; k++) {
        const [x, y] = pts[k];
        label.textContent = k % 2 === 0 ? 'Breathe in…' : 'Breathe out…';
        dot.style.transition = reducedMotion ? 'none' : 'cx 1.1s ease, cy 1.1s ease';
        dot.setAttribute('cx', x); dot.setAttribute('cy', y);
        await wait(1100);
      }
    }
    if (!stopped) { label.textContent = 'You did it! ⭐'; await wait(600); resolveDone(); }
  }
  loop();

  return { done, stop() { stopped = true; timers.forEach(clearTimeout); resolveDone(); } };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Wrap a free-play game. There is no timer pressure and no way to fail — the
// person can stay as long as they like — but they can ALSO leave the moment
// they're ready (agency matters, especially mid-episode). We surface a quiet
// "I'm ready to move on" control from the start.
function timedGame(el, durationSec, cleanup) {
  let resolveDone; const done = new Promise((r) => (resolveDone = r));
  let stopped = false;

  const more = document.createElement('div');
  more.className = 'game-continue';
  more.innerHTML = `<button class="btn btn-ghost" type="button">I’m ready to move on</button>
    <p class="muted tiny">or stay as long as you like</p>`;
  el.appendChild(more);
  more.querySelector('button').addEventListener('click', () => finish());

  function finish() {
    if (stopped) return;
    stopped = true;
    more.remove(); // don't leave a dead "move on" button beside the foot's Continue
    cleanup?.();
    resolveDone();
  }
  return { done, stop: finish, complete: finish };
}

// A small seeded PRNG so each puzzle is different but we never depend on
// Math.random (kept deterministic-per-instance and sandbox-safe).
function makeRng(seed) {
  let s = (seed || (performance.now() * 1000)) | 0 || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffle(a, rnd = makeRng()) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Word search — a freshly generated puzzle each time. An absorbing visual hunt
// that gives a racing mind a real, finite job. No timer, no way to fail. Drag
// across letters (or tap start then end) to lock a word.
// ---------------------------------------------------------------------------
const WORD_POOL = [
  'CALM', 'REST', 'EASE', 'KIND', 'WARM', 'SAFE', 'SLOW', 'SOFT', 'HOPE', 'OPEN',
  'PEACE', 'STEADY', 'GENTLE', 'GROUND', 'BREATHE', 'LIGHT', 'STILL', 'BRAVE', 'HELD',
];
const DIRS = [[1,0],[0,1],[1,1],[-1,1],[-1,0],[0,-1],[-1,-1],[1,-1]];

export function wordSearch(container, { durationSec = 210, reducedMotion = false } = {}) {
  const rnd = makeRng();
  const SIZE = 11;
  // Pick 7 words that fit, longest first for easier placement.
  const words = shuffle(WORD_POOL, rnd).filter((w) => w.length <= SIZE)
    .sort((a, b) => b.length - a.length).slice(0, 7);

  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  const placed = [];
  for (const w of words) {
    for (let attempt = 0; attempt < 120; attempt++) {
      const [dx, dy] = DIRS[Math.floor(rnd() * DIRS.length)];
      const r0 = Math.floor(rnd() * SIZE), c0 = Math.floor(rnd() * SIZE);
      const rEnd = r0 + dy * (w.length - 1), cEnd = c0 + dx * (w.length - 1);
      if (rEnd < 0 || rEnd >= SIZE || cEnd < 0 || cEnd >= SIZE) continue;
      let ok = true;
      for (let i = 0; i < w.length; i++) {
        const cell = grid[r0 + dy * i][c0 + dx * i];
        if (cell && cell !== w[i]) { ok = false; break; }
      }
      if (!ok) continue;
      const cells = [];
      for (let i = 0; i < w.length; i++) {
        const r = r0 + dy * i, c = c0 + dx * i;
        grid[r][c] = w[i];
        cells.push(r + ',' + c);
      }
      placed.push({ word: w, cells: cells.join('|') });
      break;
    }
  }
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++)
    if (!grid[r][c]) grid[r][c] = LETTERS[Math.floor(rnd() * 26)];

  const el = document.createElement('div');
  el.className = 'wordsearch';
  el.innerHTML = `
    <p class="game-hint muted">Drag across the letters to catch a word. No timer.</p>
    <div class="ws-grid" style="grid-template-columns:repeat(${SIZE},1fr)"></div>
    <ul class="ws-words">${placed.map((p) => `<li data-w="${p.word}">${p.word}</li>`).join('')}</ul>
    <p class="ws-status muted" role="status" aria-live="polite">0 of ${placed.length} found</p>`;
  container.appendChild(el);
  const gridEl = el.querySelector('.ws-grid');
  const status = el.querySelector('.ws-status');
  const cellEls = {};
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ws-cell'; b.textContent = grid[r][c];
    b.dataset.rc = r + ',' + c; b.dataset.r = r; b.dataset.c = c;
    gridEl.appendChild(b); cellEls[r + ',' + c] = b;
  }

  let dragging = false, startRC = null, path = [];
  let gc = null; // the timedGame controller, assigned below
  const foundKeys = new Set();
  let foundCount = 0;

  const linePath = (a, b) => {
    const [r1, c1] = a.split(',').map(Number), [r2, c2] = b.split(',').map(Number);
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    // Only straight lines (H/V/diagonal).
    if (!((r1 === r2) || (c1 === c2) || Math.abs(r2 - r1) === Math.abs(c2 - c1))) return null;
    const out = [];
    for (let i = 0; i <= len; i++) out.push((r1 + dr * i) + ',' + (c1 + dc * i));
    return out;
  };
  const clearHi = () => path.forEach((k) => cellEls[k]?.classList.remove('hi'));
  const setPath = (endRC) => {
    clearHi();
    const p = linePath(startRC, endRC);
    path = p || [startRC];
    path.forEach((k) => cellEls[k]?.classList.add('hi'));
  };
  const evaluate = () => {
    const letters = path.map((k) => cellEls[k].textContent).join('');
    const rev = letters.split('').reverse().join('');
    const hit = placed.find((p) => !foundKeys.has(p.word) && (p.word === letters || p.word === rev));
    if (hit) {
      foundKeys.add(hit.word); foundCount++;
      path.forEach((k) => { cellEls[k].classList.add('found'); });
      el.querySelector(`.ws-words li[data-w="${hit.word}"]`)?.classList.add('done');
      status.textContent = foundCount === placed.length
        ? 'All found. Nicely done — your mind had somewhere to be. 🌿'
        : `${foundCount} of ${placed.length} found`;
      if (foundCount === placed.length) setTimeout(() => gc?.complete?.(), 1400);
    }
    clearHi(); path = [];
  };

  gridEl.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.ws-cell'); if (!cell) return;
    dragging = true; startRC = cell.dataset.rc; setPath(startRC);
    gridEl.setPointerCapture?.(e.pointerId);
  });
  gridEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const cell = t && t.closest && t.closest('.ws-cell');
    if (cell) setPath(cell.dataset.rc);
  });
  const end = () => { if (dragging) { dragging = false; evaluate(); } };
  gridEl.addEventListener('pointerup', end);
  gridEl.addEventListener('pointercancel', end);

  gc = timedGame(el, durationSec);
  return gc;
}

// ---------------------------------------------------------------------------
// Walk it out — a footstep pacer. Gives a restless "I have to move NOW" urge
// somewhere to go. Encourages an actual walk (ideally outside), left/right in
// an easy rhythm, with a filling path — not a breath count.
// ---------------------------------------------------------------------------
export function walkPacer(container, { durationSec = 180, reducedMotion = false } = {}) {
  const el = document.createElement('div');
  el.className = 'walk';
  el.innerHTML = `
    <p class="game-hint muted">If you can, take this outside. Then just walk — one foot, then the other.</p>
    <div class="walk-track">
      <span class="foot left" aria-hidden="true">👣</span>
      <span class="foot right" aria-hidden="true">👣</span>
    </div>
    <p class="pacer-label" role="status" aria-live="polite">Ready when you are…</p>
    <div class="walk-progress"><div></div></div>
    <button class="btn btn-ghost" data-done type="button">I’ve walked enough</button>`;
  container.appendChild(el);
  const left = el.querySelector('.foot.left'), right = el.querySelector('.foot.right');
  const label = el.querySelector('.pacer-label');
  const bar = el.querySelector('.walk-progress > div');

  let stopped = false, step = 0, elapsed = 0;
  let resolveDone; const done = new Promise((r) => (resolveDone = r));
  const doneBtn = el.querySelector('[data-done]');
  const finish = () => { if (stopped) return; stopped = true; clearInterval(iv); doneBtn.remove(); resolveDone(); };
  doneBtn.addEventListener('click', finish);

  const words = ['left…', 'right…', 'good…', 'keep going…'];
  const iv = setInterval(() => {
    if (stopped) return;
    step++; elapsed += 0.9;
    const isLeft = step % 2 === 1;
    left.classList.toggle('on', isLeft && !reducedMotion);
    right.classList.toggle('on', !isLeft && !reducedMotion);
    label.textContent = words[step % 2] + (step > 8 ? '' : '');
    bar.style.width = Math.min(100, (elapsed / durationSec) * 100) + '%';
    if (elapsed >= durationSec) {
      label.textContent = 'However far you got — that counts.';
      clearInterval(iv);
      setTimeout(finish, 1500); // let the closing line land, then move on
    }
  }, 900);

  return { done, stop: finish };
}

// ---------------------------------------------------------------------------
// Blow the cloud away (child) — a grey cloud hides the sun/their buddy. Each
// "blow" (tap) puffs it smaller until it clears. Turns a long exhale into a
// game a young child wants to play, with a reveal to hold attention.
// ---------------------------------------------------------------------------
export function blowCloud(container, { reducedMotion = false, animal = '', revealEmoji = '', revealName = '' } = {}) {
  const reveal = revealEmoji || (animal ? animalEmoji(animal) : '☀️');
  const el = document.createElement('div');
  el.className = 'blowcloud';
  el.innerHTML = `
    <p class="game-hint muted">Take a big breath… and blow the cloud away! (tap to blow)</p>
    <div class="sky" tabindex="0" role="button" aria-label="Blow the cloud">
      <div class="reveal">${reveal}</div>
      <div class="cloud">☁️</div>
    </div>
    <p class="pacer-label" role="status" aria-live="polite">Blow!</p>`;
  container.appendChild(el);
  const sky = el.querySelector('.sky');
  const cloud = el.querySelector('.cloud');
  const label = el.querySelector('.pacer-label');
  let puffs = 0; const need = 5;
  let resolveDone; const done = new Promise((r) => (resolveDone = r));
  let finished = false;
  const blow = () => {
    if (finished) return;
    puffs++;
    const scale = Math.max(0, 1 - puffs / need);
    cloud.style.transform = reducedMotion ? 'none' : `scale(${scale})`;
    cloud.style.opacity = String(scale);
    label.textContent = puffs < need
      ? 'Again… big blow!'
      : (revealName ? `You found ${revealName}! 🌟` : 'You did it! The sun came out! 🌟');
    if (puffs >= need) {
      finished = true;
      el.querySelector('.reveal').classList.add('show');
      setTimeout(resolveDone, 1400);
    }
  };
  sky.addEventListener('pointerdown', blow);
  sky.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') blow(); });
  return { done, stop: () => { finished = true; resolveDone(); } };
}

// ---------------------------------------------------------------------------
// Wiggle parade (child) — buddy calls out big, silly moves. A short burst of
// guided movement discharges the surge and redirects through play, before a
// meltdown fully lands. A grown-up joining in is the point (co-regulation).
// ---------------------------------------------------------------------------
export function wiggleParade(container, { reducedMotion = false, buddyName = 'Buddy', theme = null } = {}) {
  const isPups = theme && theme.word === 'pup';
  const MOVES = isPups
    ? [
        { e: '🚒', t: 'Stomp like Marshall’s fire truck!' },
        { e: '🚁', t: 'Fly your arms like Skye!' },
        { e: '🚓', t: 'Zoom low like Chase on patrol!' },
        { e: '🏗️', t: 'Dig and scoop like Rubble!' },
        { e: '🐢', t: 'Now go sloooow, calm paws…' },
        { e: '🐾', t: 'Shake the wiggles out… and freeze!' },
      ]
    : [
        { e: '🐘', t: 'Stomp like an elephant!' },
        { e: '🐦', t: 'Flap like a bird!' },
        { e: '🦘', t: 'Hop like a kangaroo!' },
        { e: '🌟', t: 'Reach up for the stars!' },
        { e: '🐢', t: 'Now sloooow like a turtle…' },
        { e: '🫧', t: 'Shake the wiggles out… and freeze!' },
      ];
  const el = document.createElement('div');
  el.className = 'parade';
  el.innerHTML = `
    <p class="game-hint muted">${escapeName(buddyName)} says… do it together!</p>
    <div class="parade-emoji" aria-hidden="true">🎉</div>
    <p class="parade-move" role="status" aria-live="polite">Ready?</p>
    <button class="btn btn-primary" data-next type="button">Start</button>`;
  container.appendChild(el);
  const emoji = el.querySelector('.parade-emoji');
  const move = el.querySelector('.parade-move');
  const btn = el.querySelector('[data-next]');
  let i = -1;
  let resolveDone; const done = new Promise((r) => (resolveDone = r));
  btn.addEventListener('click', () => {
    i++;
    if (i >= MOVES.length) {
      emoji.textContent = '💛'; move.textContent = 'Great wiggling! All done.';
      btn.style.display = 'none'; setTimeout(resolveDone, 900); return;
    }
    emoji.textContent = MOVES[i].e; move.textContent = MOVES[i].t;
    if (!reducedMotion) { emoji.classList.remove('pop'); void emoji.offsetWidth; emoji.classList.add('pop'); }
    btn.textContent = i === MOVES.length - 1 ? 'Done!' : 'Did it! Next';
  });
  return { done, stop: () => resolveDone() };
}

// ---------------------------------------------------------------------------
// Pop the pop-ups (child) — friendly characters peek out; tap to pop them with
// a happy wobble. A completely winnable, high-distraction tap game.
// ---------------------------------------------------------------------------
export function popPups(container, { theme = {}, reducedMotion = false } = {}) {
  const emojis = theme.emojis || ['🐶', '🐰', '⭐', '🐥', '🐢', '🦊'];
  const crew = theme.crew || 'friends';
  const el = document.createElement('div');
  el.className = 'popgame';
  el.innerHTML = `
    <p class="game-hint muted">Tap the ${escapeName(crew)} as they peek out!</p>
    <div class="pop-field" aria-label="tap the characters"></div>
    <p class="pop-status" role="status" aria-live="polite">Pop them! 0</p>`;
  container.appendChild(el);
  const field = el.querySelector('.pop-field');
  const status = el.querySelector('.pop-status');
  const target = 12;
  let count = 0, gc = null, stopped = false;

  const spawn = () => {
    if (stopped) return;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'pop-item';
    item.textContent = emojis[Math.floor((performance.now() + count) % emojis.length)];
    item.style.left = (8 + ((performance.now() * 7) % 78)) + '%';
    item.style.top = (10 + ((performance.now() * 13) % 72)) + '%';
    if (!reducedMotion) item.classList.add('rise');
    const remove = () => item.remove();
    const timer = setTimeout(remove, 2400);
    item.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      clearTimeout(timer);
      if (!reducedMotion) { item.classList.add('pop'); setTimeout(remove, 200); } else remove();
      count++;
      status.textContent = count >= target ? `You popped them all! 🎉` : `Pop them! ${count}`;
      if (count >= target) { stopped = true; setTimeout(() => gc?.complete?.(), 900); }
    });
    field.appendChild(item);
  };
  const iv = setInterval(spawn, reducedMotion ? 1100 : 750);
  spawn();

  gc = timedGame(el, 90, () => { stopped = true; clearInterval(iv); });
  return gc;
}

// ---------------------------------------------------------------------------
// Color helpers (child) — the buddy names a color; the child taps the matching
// blob. One clear, doable job, with a cheer each round.
// ---------------------------------------------------------------------------
export function colorTap(container, { favoriteColor = 'blue', buddyName = 'Your buddy', reducedMotion = false, roster = null } = {}) {
  const COLORS = [
    { k: 'red', hex: '#e06666' }, { k: 'blue', hex: '#6fa8dc' }, { k: 'green', hex: '#93c47d' },
    { k: 'yellow', hex: '#ffd966' }, { k: 'purple', hex: '#b48ee0' }, { k: 'orange', hex: '#f0a35e' },
    { k: 'pink', hex: '#e79ac0' }, { k: 'teal', hex: '#5bc0be' },
  ];
  const el = document.createElement('div');
  el.className = 'colortap';
  el.innerHTML = `
    <p class="ct-say" role="status" aria-live="polite">Get ready…</p>
    <div class="ct-blobs"></div>
    <p class="ct-cheer muted" aria-live="polite"></p>`;
  container.appendChild(el);
  const say = el.querySelector('.ct-say');
  const blobs = el.querySelector('.ct-blobs');
  const cheer = el.querySelector('.ct-cheer');
  // When a character roster is provided (e.g. the rescue pups), each round is a
  // named helper asking for THEIR colour — so the characters lead the game.
  const crew = (roster && roster.length) ? roster.filter((p) => COLORS.some((c) => c.k === p.color)) : null;
  const rounds = crew ? Math.min(6, crew.length) : 5;
  let round = 0, gc = null;
  const cheers = ['Yes! 🎉', 'You got it! ⭐', 'Woohoo!', 'Amazing!', 'High five! 🙌', 'Paws-ome! 🐾'];

  const nextRound = () => {
    round++;
    if (round > rounds) {
      say.textContent = crew ? 'The whole team is ready! 🐾🌈' : 'You’re a color star! 🌈';
      blobs.innerHTML = ''; setTimeout(() => gc?.complete?.(), 900); return;
    }
    let target, who = null;
    if (crew) {
      who = crew[(round - 1) % crew.length];
      target = COLORS.find((c) => c.k === who.color) || shuffle(COLORS)[0];
    } else {
      const pool = shuffle(COLORS);
      target = round === 1 ? (COLORS.find((c) => c.k === favoriteColor) || pool[0]) : pool[0];
    }
    const choices = shuffle([target, ...shuffle(COLORS).filter((c) => c.k !== target.k).slice(0, 3)]);
    say.innerHTML = who
      ? `Help <b>${escapeName(who.name)}</b> the ${escapeName(who.role)} — tap ${target.k}! ${who.emoji}`
      : `${escapeName(buddyName)} says: tap ${target.k}!`;
    blobs.innerHTML = '';
    choices.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ct-blob'; b.style.background = c.hex;
      b.setAttribute('aria-label', c.k);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (c.k === target.k) {
          cheer.textContent = who ? `${who.name}: ${cheers[(round - 1) % cheers.length]}` : cheers[(round - 1) % cheers.length];
          if (!reducedMotion) b.classList.add('pop');
          setTimeout(nextRound, 650);
        } else {
          if (!reducedMotion) { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); }
          cheer.textContent = 'Try again 💛';
        }
      });
      blobs.appendChild(b);
    });
  };
  setTimeout(nextRound, 600);

  gc = timedGame(el, 90);
  return gc;
}

// ---------------------------------------------------------------------------
// Draw your feeling (child) — a finger scribble pad. A developmentally natural
// way to "say" a big feeling without words. Soft colours; clearable.
// ---------------------------------------------------------------------------
export function scribble(container, { reducedMotion = false } = {}) {
  const el = document.createElement('div');
  el.className = 'scribble';
  el.innerHTML = `
    <p class="game-hint muted">Draw how you feel — squiggles, colors, anything.</p>
    <div class="scribble-tools" role="group" aria-label="colors"></div>
    <canvas class="scribble-pad" width="600" height="440" aria-label="drawing area"></canvas>
    <button class="btn btn-ghost btn-clear" type="button">Start over</button>`;
  container.appendChild(el);
  const tools = el.querySelector('.scribble-tools');
  const canvas = el.querySelector('.scribble-pad');
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 10;

  const palette = ['#6fa8dc', '#93c47d', '#ffd966', '#e06666', '#b48ee0', '#f0a35e', '#eef2fb'];
  let color = palette[0];
  palette.forEach((hex, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch' + (i === 0 ? ' sel' : '');
    b.style.background = hex; b.setAttribute('aria-label', 'color');
    b.addEventListener('pointerdown', () => {
      color = hex; tools.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('sel', s === b));
    });
    tools.appendChild(b);
  });

  let drawing = false, last = null;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  };
  const start = (e) => { e.preventDefault(); drawing = true; last = pos(e); dot(last); };
  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
  };
  const dot = (p) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); };
  const end = () => { drawing = false; };
  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);
  el.querySelector('.btn-clear').addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

  return timedGame(el, 120);
}

// ---------------------------------------------------------------------------
// Pup Rescue (child) — get the whole rescue team ready, one pup at a time. Each
// tap gives a pup their badge with a happy cheer and their name/role. Paced,
// named, and completely winnable. Falls back to generic friends off-theme.
// ---------------------------------------------------------------------------
export function pupRescue(container, { roster = null, theme = {}, reducedMotion = false } = {}) {
  const crewWord = theme.crew || 'team';
  const team = (roster && roster.length)
    ? roster.slice(0, 6)
    : (theme.emojis || ['🐶', '🐰', '⭐', '🐥', '🐢', '🦊']).slice(0, 5).map((e, i) => ({ name: `Friend ${i + 1}`, emoji: e, role: 'helper' }));

  const el = document.createElement('div');
  el.className = 'puprescue';
  el.innerHTML = `
    <p class="game-hint muted">Help get the ${escapeName(crewWord)} ready — tap each one!</p>
    <div class="pr-row"></div>
    <p class="pr-say" role="status" aria-live="polite">Tap the glowing one!</p>`;
  container.appendChild(el);
  const row = el.querySelector('.pr-row');
  const say = el.querySelector('.pr-say');

  const btns = team.map((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pr-pup'; b.dataset.i = String(i);
    b.innerHTML = `<span class="pr-emoji">${p.emoji}</span><small>${escapeName(p.name)}</small>`;
    row.appendChild(b);
    return b;
  });

  let idx = 0, gc = null;
  const arm = () => {
    btns.forEach((b, i) => b.classList.toggle('active', i === idx));
    if (team[idx]) say.textContent = `Tap ${team[idx].name}!`;
  };
  btns.forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const i = Number(b.dataset.i);
    if (i !== idx) return; // gently guide to the glowing one
    b.classList.remove('active'); b.classList.add('ready');
    if (!reducedMotion) { b.classList.add('pop'); }
    const p = team[idx];
    say.textContent = `${p.name} the ${p.role} is ready! ${p.emoji}`;
    idx++;
    if (idx >= team.length) {
      setTimeout(() => { say.textContent = `The ${crewWord} are all ready — let’s go! 🐾🎉`; setTimeout(() => gc?.complete?.(), 900); }, 600);
    } else {
      setTimeout(arm, 650);
    }
  }));
  setTimeout(arm, 500);

  gc = timedGame(el, 90);
  return gc;
}

function animalEmoji(name) {
  const n = String(name).toLowerCase();
  const map = { bunny: '🐰', rabbit: '🐰', cat: '🐱', kitty: '🐱', dog: '🐶', puppy: '🐶',
    dino: '🦖', dinosaur: '🦖', fish: '🐟', bear: '🐻', lion: '🦁', unicorn: '🦄',
    fox: '🦊', frog: '🐸', duck: '🐥', owl: '🦉', horse: '🐴', turtle: '🐢', elephant: '🐘' };
  for (const k in map) if (n.includes(k)) return map[k];
  return '🐻';
}
function escapeName(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const GAMES = { breathOrb: breathePacer, ripples, match, starBreath, wordSearch, walkPacer, blowCloud, wiggleParade, popPups, colorTap, scribble, pupRescue };
