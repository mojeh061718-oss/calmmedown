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
// Wrap a free-play game so it resolves after a soft time budget, with a
// "keep going" grace so the user is never yanked away mid-breath.
function timedGame(el, durationSec, cleanup) {
  let resolveDone; const done = new Promise((r) => (resolveDone = r));
  let stopped = false;
  const t = setTimeout(() => {
    if (stopped) return;
    const more = document.createElement('div');
    more.className = 'game-continue';
    more.innerHTML = `<button class="btn btn-ghost" type="button">I’m ready to move on</button>
      <p class="muted tiny">or keep going as long as you like</p>`;
    el.appendChild(more);
    more.querySelector('button').addEventListener('click', () => { finish(); });
  }, durationSec * 1000);

  function finish() {
    if (stopped) return;
    stopped = true;
    clearTimeout(t);
    cleanup?.();
    resolveDone();
  }
  return { done, stop: finish };
}

function shuffle(a) {
  // Fisher–Yates without Math.random (which is unavailable in some sandboxes):
  // seed from performance timing spread across a fixed permutation walk.
  const arr = a.slice();
  let seed = (performance.now() * 1000) | 0;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const GAMES = { breathOrb: breathePacer, ripples, match, starBreath };
