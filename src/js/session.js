// session.js
// Runs the guided ~10-minute "let's help you" session: a soft intro, then each
// chosen technique in turn (breathing, grounding, a focus game, kinder self-
// talk…), then hands back to the app for the closing re-assessment.
//
// Every technique screen shows one thing at a time, a gentle "Continue", and an
// optional, no-pressure thumb so the app can learn what actually helped.

import { techniqueById, childTheme } from './content.js';
import { breathePacer, ripples, match, starBreath, wordSearch, walkPacer, blowCloud, wiggleParade, popPups, colorTap, scribble, pupRescue } from './games.js';

export function runGuidedSession(container, profile, ids, opts = {}) {
  const reducedMotion = profile.prefs?.reducedMotion || opts.reducedMotion;
  const ob = profile.onboarding || {};
  const ratings = {};
  let idx = -1; // -1 = intro
  let active = null; // currently running game controller

  const root = document.createElement('div');
  root.className = 'session';
  container.innerHTML = '';
  container.appendChild(root);

  function stopActive() {
    try { active?.stop?.(); } catch { /* ignore */ }
    active = null;
  }

  function progressBar() {
    const pct = Math.max(0, Math.round((idx / ids.length) * 100));
    return `<div class="session-progress"><div style="width:${pct}%"></div></div>`;
  }

  function next() {
    stopActive();
    idx += 1;
    if (idx >= ids.length) return finishAll();
    renderTechnique(ids[idx]);
  }

  // --- Intro ---------------------------------------------------------------
  function renderIntro() {
    const child = profile.band === 'child';
    const outward = ob.style === 'outward';
    const theme = child ? childTheme(profile) : null;
    const crewLine = (theme && theme.roster)
      ? `<p class="crew-line">${theme.roster.slice(0, 4).map((p) => p.emoji).join(' ')} ${escapeHtml(theme.heroes.slice(0, 3).join(', '))} are here to help!</p>`
      : '';
    const anchor = (ob.anchor && !outward) ? `<p class="soft-anchor">Bringing to mind: <em>${escapeHtml(ob.anchor)}</em></p>` : crewLine;
    const heading = child ? 'Let’s get cozy.'
      : outward ? 'Let’s get you out of your head.'
      : 'You’re safe. Let’s take a few minutes just for you.';
    const lede = child ? 'We’ll do some fun calm-down things together.'
      : outward ? 'No sitting still, no fixing anything. We’ll get you moving and give your mind something to do. Stop whenever you want.'
      : 'Nothing to fix, nothing to decide. We’ll go one gentle step at a time. If you need to stop, you can — any time.';
    root.innerHTML = `
      <div class="screen calm-screen fade-in">
        <div class="breathe-dot" aria-hidden="true"></div>
        <h2>${heading}</h2>
        <p class="lede">${lede}</p>
        ${anchor}
        <button class="btn btn-primary btn-lg" id="begin">${outward ? 'Let’s go' : 'Begin'}</button>
      </div>`;
    root.querySelector('#begin').addEventListener('click', next);
  }

  // --- A single technique --------------------------------------------------
  function renderTechnique(id) {
    const t = techniqueById(id);
    if (!t) return next();

    root.innerHTML = `
      ${progressBar()}
      <div class="screen technique fade-in" data-kind="${t.kind}">
        <p class="eyebrow">${idx + 1} of ${ids.length}</p>
        <h2>${escapeHtml(t.title)}</h2>
        <p class="lede">${escapeHtml(t.lead)}</p>
        <div class="technique-body"></div>
        <div class="technique-foot"></div>
      </div>`;
    const body = root.querySelector('.technique-body');
    const foot = root.querySelector('.technique-foot');

    // Renderers either resolve `done` themselves (paced tools/games) or wait
    // for the user to press Continue (step/text tools).
    const kind = t.kind;
    if (kind === 'breath' || kind === 'child-breath') {
      active = breathePacer(body, { pattern: t.breath?.pattern, cycles: t.breath?.cycles || 8, reducedMotion });
      whenDone(active.done, t, foot, body);
    } else if (kind === 'game') {
      const gc = runGame(t, body, reducedMotion, profile);
      active = gc;
      whenDone(gc.done, t, foot, body);
    } else if (kind === 'grounding') {
      renderGrounding(body, foot, t, profile);
    } else if (kind === 'label') {
      renderLabel(body, foot, t);
    } else if (kind === 'compassion') {
      renderCompassion(body, foot, t, ob);
    } else if (kind === 'anchor') {
      renderAnchor(body, foot, t, ob);
    } else if (kind === 'child-feelings') {
      renderChildFeelings(body, foot, t);
    } else if (kind === 'nourish') {
      renderNourish(body, foot, t);
    } else {
      // 'guide', 'outside', and 'body' — stepped instructions.
      renderSteps(body, foot, t);
    }
  }

  // When a self-completing renderer finishes, reveal the "why it helps" note,
  // the optional thumb, and Continue.
  function whenDone(donePromise, t, foot, body) {
    donePromise.then(() => footControls(foot, t));
  }

  function footControls(foot, t, { immediate = false } = {}) {
    foot.innerHTML = `
      ${t.why ? `<details class="why"><summary>Why this helps</summary><p>${escapeHtml(t.why)}</p></details>` : ''}
      <div class="thumbs" role="group" aria-label="Did this help?">
        <span class="muted tiny">Did this help?</span>
        <button class="thumb" data-r="up" type="button" aria-label="This helped">👍</button>
        <button class="thumb" data-r="down" type="button" aria-label="Not for me">👎</button>
      </div>
      <button class="btn btn-primary" data-next type="button">${idx + 1 >= ids.length ? 'Finish' : 'Continue'}</button>`;
    foot.querySelectorAll('.thumb').forEach((b) =>
      b.addEventListener('click', () => {
        ratings[t.id] = b.dataset.r;
        foot.querySelectorAll('.thumb').forEach((x) => x.classList.toggle('sel', x === b));
      })
    );
    foot.querySelector('[data-next]').addEventListener('click', next);
    if (immediate) foot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // --- Step-based renderers ------------------------------------------------
  function renderSteps(body, foot, t) {
    const steps = t.steps || [];
    let i = 0;
    const render = () => {
      body.innerHTML = `
        <ol class="steps" aria-label="steps">
          ${steps.map((s, k) => `<li class="${k === i ? 'now' : k < i ? 'past' : ''}">${escapeHtml(s)}</li>`).join('')}
        </ol>`;
      if (i < steps.length - 1) {
        foot.innerHTML = `<button class="btn btn-primary" id="stepnext" type="button">Next step</button>`;
        foot.querySelector('#stepnext').addEventListener('click', () => { i += 1; render(); });
      } else {
        footControls(foot, t);
      }
    };
    render();
  }

  function renderGrounding(body, foot, t) {
    const prompts = [
      { n: 5, sense: 'things you can see', icon: '👀' },
      { n: 4, sense: 'things you can feel', icon: '✋' },
      { n: 3, sense: 'things you can hear', icon: '👂' },
      { n: 2, sense: 'things you can smell', icon: '👃' },
      { n: 1, sense: 'slow breath, just for you', icon: '🌬️' },
    ];
    let i = 0;
    const render = () => {
      const p = prompts[i];
      body.innerHTML = `
        <div class="ground fade-in">
          <div class="ground-icon" aria-hidden="true">${p.icon}</div>
          <p class="ground-count">${p.n}</p>
          <p class="ground-prompt">${escapeHtml(p.sense)}</p>
          <p class="muted tiny">Name them slowly, out loud or in your head.</p>
        </div>`;
      foot.innerHTML = `<button class="btn btn-primary" id="gnext" type="button">${i < prompts.length - 1 ? 'Next' : 'Done'}</button>`;
      foot.querySelector('#gnext').addEventListener('click', () => {
        i += 1;
        if (i < prompts.length) render();
        else footControls(foot, t, { immediate: true });
      });
    };
    render();
  }

  function renderLabel(body, foot, t) {
    const words = ['Overwhelmed', 'Anxious', 'Angry', 'Sad', 'Numb', 'Scared', 'Frustrated', 'Tired', 'Ashamed', 'Lonely', 'Restless', 'Tense'];
    body.innerHTML = `
      <p class="lede-sub">There’s nothing to fix. Just name what’s here right now — tap any that fit.</p>
      <div class="chips">${words.map((w) => `<button class="chip" type="button">${w}</button>`).join('')}</div>
      <input class="field" id="labelother" placeholder="…or your own word" aria-label="another word" />
      <p class="label-echo" role="status" aria-live="polite"></p>`;
    const echo = body.querySelector('.label-echo');
    const picked = new Set();
    const refresh = () => {
      echo.textContent = picked.size ? `You feel ${[...picked].join(', ').toLowerCase()}. That makes sense. You’re allowed to feel this.` : '';
    };
    body.querySelectorAll('.chip').forEach((c) =>
      c.addEventListener('click', () => {
        c.classList.toggle('sel');
        if (picked.has(c.textContent)) picked.delete(c.textContent); else picked.add(c.textContent);
        refresh();
      })
    );
    body.querySelector('#labelother').addEventListener('change', (e) => {
      const v = e.target.value.trim();
      if (v) { picked.add(v); refresh(); }
    });
    footControls(foot, t);
  }

  function renderCompassion(body, foot, t, ob) {
    const kind = ob.words ? escapeHtml(ob.words) : 'May I be gentle with myself right now.';
    body.innerHTML = `
      <div class="compassion fade-in">
        <p class="c-line">This is a hard moment.</p>
        <p class="c-line delay1">Hard moments are part of being human — you are not alone in this.</p>
        <p class="c-line delay2">Put a hand on your heart if you’d like. Feel the warmth.</p>
        <blockquote class="c-quote delay3">${kind}</blockquote>
      </div>`;
    footControls(foot, t);
  }

  function renderAnchor(body, foot, t, ob) {
    const place = ob.anchor ? escapeHtml(ob.anchor) : 'a place where you have felt completely safe';
    body.innerHTML = `
      <div class="anchor fade-in">
        <p>Close your eyes if it feels okay. Picture <strong>${place}</strong>.</p>
        <ul class="anchor-senses">
          <li>What do you see there?</li>
          <li>What can you hear?</li>
          <li>What does the air feel like?</li>
        </ul>
        <p class="muted">Stay here as long as you like. Your body knows this place is safe.</p>
      </div>`;
    footControls(foot, t);
  }

  // Young children "say" feelings through pictures, weather, and size — not
  // words or scales. This offers a few playful representations to pick from.
  function renderChildFeelings(body, foot, t) {
    const theme = childTheme(profile);
    const helper = theme.roster && theme.roster[0];
    const buddy = helper ? `${helper.emoji} ${helper.name}:` : theme.buddy;
    const weathers = [
      ['⛈️', 'Stormy'], ['🌧️', 'Rainy'], ['☁️', 'Cloudy'], ['🌤️', 'Peeking sun'], ['☀️', 'Sunny'],
    ];
    const sizes = [
      ['🐭', 'a little', 'sz-s'], ['🐰', 'medium', 'sz-m'], ['🦁', 'SO big', 'sz-l'],
    ];
    body.innerHTML = `
      <div class="feelex">
        <p class="feelex-q">What’s the weather inside you?</p>
        <div class="weather-row">${weathers.map(([e, l]) => `<button class="weather-btn" type="button" aria-label="${l}"><span>${e}</span><small>${l}</small></button>`).join('')}</div>
        <p class="feelex-q">How big is the feeling?</p>
        <div class="size-row">${sizes.map(([e, l, c]) => `<button class="size-btn ${c}" type="button" aria-label="${l}"><span>${e}</span><small>${l}</small></button>`).join('')}</div>
        <p class="label-echo big" role="status" aria-live="polite"></p>
      </div>`;
    const echo = body.querySelector('.label-echo');
    const pick = { weather: null, size: null };
    const update = () => {
      if (pick.weather && pick.size) {
        echo.textContent = `${buddy} Thank you for showing me. Even ${pick.size} feelings get smaller. I’m right here with you. 💛`;
      } else if (pick.weather || pick.size) {
        echo.textContent = 'Thank you for showing me. 💛';
      }
    };
    body.querySelectorAll('.weather-btn').forEach((b) =>
      b.addEventListener('click', () => {
        body.querySelectorAll('.weather-btn').forEach((x) => x.classList.toggle('sel', x === b));
        pick.weather = b.getAttribute('aria-label'); update();
      })
    );
    body.querySelectorAll('.size-btn').forEach((b) =>
      b.addEventListener('click', () => {
        body.querySelectorAll('.size-btn').forEach((x) => x.classList.toggle('sel', x === b));
        pick.size = b.getAttribute('aria-label'); update();
      })
    );
    footControls(foot, t);
  }

  function runGame(t, body, reducedMotion, profile) {
    const dur = t.durationSec || 120;
    const cob = profile.onboarding || {};
    if (t.game === 'ripples') return ripples(body, { durationSec: dur, reducedMotion });
    if (t.game === 'match') {
      const sym = profile.band === 'child' ? ['🐢', '🦋', '🐟', '⭐', '🌈', '🐥'] : undefined;
      return match(body, { durationSec: dur, reducedMotion, symbols: sym });
    }
    if (t.game === 'starBreath') return starBreath(body, { durationSec: dur, reducedMotion });
    if (t.game === 'wordSearch') return wordSearch(body, { durationSec: dur, reducedMotion });
    if (t.game === 'walkPacer') return walkPacer(body, { durationSec: dur, reducedMotion });
    const theme = profile.band === 'child' ? childTheme(profile) : null;
    const helper = theme && theme.roster && theme.roster[0]; // a named pup, when themed
    const buddyName = (theme && theme.heroes[0]) || cob.buddyName || 'Your buddy';
    if (t.game === 'blowCloud') return blowCloud(body, {
      reducedMotion,
      animal: cob.favoriteAnimal || '',
      revealEmoji: helper ? helper.emoji : (theme ? theme.buddy : ''),
      revealName: helper ? helper.name : (theme && theme.heroes[0]) || '',
    });
    if (t.game === 'wiggleParade') return wiggleParade(body, { reducedMotion, buddyName, theme });
    if (t.game === 'popPups') return popPups(body, { reducedMotion, theme });
    if (t.game === 'colorTap') return colorTap(body, { reducedMotion, buddyName, favoriteColor: cob.favoriteColor || 'blue', roster: theme && theme.roster });
    if (t.game === 'scribble') return scribble(body, { reducedMotion });
    if (t.game === 'pupRescue') return pupRescue(body, { reducedMotion, theme, roster: theme && theme.roster });
    return breathePacer(body, { pattern: 'sigh', cycles: 8, reducedMotion });
  }

  // "A little care" — a gentle, generic body-care nudge. Deliberately soft and
  // opt-in-feeling: tick what you can, skip what you can't. Never clinical.
  function renderNourish(body, foot, t) {
    const items = [
      { e: '💧', label: 'A few sips of water' },
      { e: '🍎', label: 'A bite of something to eat' },
      { e: '🪟', label: 'Open a window or get some air' },
      { e: '💊', label: 'Anything your daily routine includes' },
      { e: '🧣', label: 'Something warm or comfortable on' },
    ];
    body.innerHTML = `
      <p class="lede-sub">When things feel heavy, small care slips first. No pressure — just tick what you can, skip the rest.</p>
      <ul class="nourish-list">
        ${items.map((it, i) => `<li><label class="nourish-item"><input type="checkbox" data-i="${i}"><span class="ni-e">${it.e}</span><span>${it.label}</span></label></li>`).join('')}
      </ul>
      <p class="muted tiny">This is a kindness, not a checklist to finish.</p>`;
    footControls(foot, t);
  }

  // --- Wrap up -------------------------------------------------------------
  function finishAll() {
    root.innerHTML = `
      <div class="screen calm-screen fade-in">
        <div class="breathe-dot small" aria-hidden="true"></div>
        <h2>${profile.band === 'child' ? 'You did such a good job.' : 'You made it through.'}</h2>
        <p class="lede">${profile.band === 'child'
          ? 'Let’s see how you feel now.'
          : 'That took courage. Let’s gently check in again — no right answer, just how you feel now.'}</p>
        <button class="btn btn-primary btn-lg" id="toPost">See how I feel now</button>
      </div>`;
    root.querySelector('#toPost').addEventListener('click', () => {
      opts.onDone?.({ techniques: ids.slice(), ratings });
    });
  }

  // Kick off.
  renderIntro();

  return {
    stop() { stopActive(); },
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
