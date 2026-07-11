// app.js
// The controller: profile selection, onboarding, the daily check-in, routing
// into the guided session when scores are low, the closing re-assessment, and
// the result. Screens render into #app. No framework — just small render fns.

import { CHECKIN, ONBOARDING } from './content.js';
import * as store from './store.js';
import { buildSession, dailyInsight, describePlan } from './adapt.js';
import { runGuidedSession } from './session.js';

const app = document.getElementById('app');

// Shared mutable context for a check-in in progress.
let flow = null; // { profile, record, pre, ids }

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function mount(html) { app.innerHTML = html; app.scrollTop = 0; window.scrollTo(0, 0); }
function el(sel) { return app.querySelector(sel); }

// Apply the active profile's motion preference to the document.
function applyMotion(profile) {
  document.documentElement.classList.toggle('reduce-motion', Boolean(profile?.prefs?.reducedMotion));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
export function start() {
  const profiles = store.listProfiles();
  if (profiles.length === 0) return screenCreateProfile(true);
  const active = store.activeProfile() || profiles[0];
  store.setActiveProfile(active.id);
  applyMotion(active);
  if (!active.onboarded) return screenOnboarding(active);
  return screenHome(active);
}

// ---------------------------------------------------------------------------
// Profile creation
// ---------------------------------------------------------------------------
function screenCreateProfile(first) {
  mount(`
    <div class="wrap">
      <header class="brand"><span class="brand-mark">🫧</span><h1>calm me down</h1></header>
      <div class="card">
        <h2>${first ? 'Let’s set up your first profile' : 'Add a profile'}</h2>
        <p class="muted">This app lives only on this device. Nothing you enter is ever sent anywhere.</p>
        <form id="pform" class="form">
          <label class="field-label">Name
            <input class="field" name="name" required maxlength="40" placeholder="What should I call you?" autocomplete="off" />
          </label>
          <label class="field-label">Age
            <input class="field" name="age" required type="number" min="1" max="120" placeholder="Age" />
          </label>
          <fieldset class="field-label">Sex
            <div class="seg" role="radiogroup" aria-label="Sex">
              <label class="seg-opt"><input type="radio" name="sex" value="female" required> Female</label>
              <label class="seg-opt"><input type="radio" name="sex" value="male"> Male</label>
              <label class="seg-opt"><input type="radio" name="sex" value="other"> Other</label>
            </div>
          </fieldset>
          <button class="btn btn-primary btn-lg" type="submit">Continue</button>
          ${first ? '' : '<button class="btn btn-ghost" type="button" id="cancel">Cancel</button>'}
        </form>
      </div>
    </div>`);
  const form = el('#pform');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const profile = store.createProfile({
      name: fd.get('name'), age: fd.get('age'), sex: fd.get('sex'),
    });
    applyMotion(profile);
    screenOnboarding(profile);
  });
  el('#cancel')?.addEventListener('click', () => start());
}

// ---------------------------------------------------------------------------
// Onboarding — the extensive, gentle interview
// ---------------------------------------------------------------------------
function screenOnboarding(profile) {
  const questions = ONBOARDING[profile.band] || ONBOARDING.adult;
  const answers = {};
  let i = 0;

  function intro() {
    mount(`
    <div class="wrap">
      <div class="card fade-in">
        <span class="brand-mark big">🫧</span>
        <h2>${profile.band === 'child' ? `Let’s learn about ${esc(profile.name)}` : `Hi ${esc(profile.name)} — let’s get to know each other`}</h2>
        <p class="muted">A few questions so I can learn how to help you in the moments that feel hard. There are no wrong answers, and you can change these later.</p>
        <button class="btn btn-primary btn-lg" id="obStart">Start</button>
      </div>
    </div>`);
    el('#obStart').addEventListener('click', () => render());
  }

  function render() {
    if (i >= questions.length) return finish();
    const q = questions[i];
    const progress = `<div class="ob-progress"><div style="width:${Math.round((i / questions.length) * 100)}%"></div></div>`;
    let control = '';
    if (q.type === 'multi' || q.type === 'single') {
      const opts = q.options.map((o) => {
        const value = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        return `<button class="opt" type="button" data-val="${esc(value)}">${esc(label)}</button>`;
      }).join('');
      control = `<div class="opts ${q.type}">${opts}</div>`;
    } else if (q.type === 'text') {
      control = `<input class="field" id="obtext" placeholder="${esc(q.placeholder || '')}" maxlength="120" />`;
    }
    mount(`
      <div class="wrap">
        ${progress}
        <div class="card fade-in ob-card">
          <p class="eyebrow">Question ${i + 1} of ${questions.length}</p>
          <h2>${esc(q.title)}</h2>
          ${q.subtitle ? `<p class="muted">${esc(q.subtitle)}</p>` : ''}
          ${control}
          <div class="ob-actions">
            ${i > 0 ? '<button class="btn btn-ghost" id="obBack" type="button">Back</button>' : '<span></span>'}
            <button class="btn btn-primary" id="obNext" type="button">${q.optional ? 'Skip / Next' : 'Next'}</button>
          </div>
        </div>
      </div>`);

    const selected = new Set(Array.isArray(answers[q.id]) ? answers[q.id] : answers[q.id] ? [answers[q.id]] : []);
    app.querySelectorAll('.opt').forEach((b) => {
      if (selected.has(b.dataset.val)) b.classList.add('sel');
      b.addEventListener('click', () => {
        if (q.type === 'single') {
          app.querySelectorAll('.opt').forEach((x) => x.classList.remove('sel'));
          b.classList.add('sel');
          selected.clear(); selected.add(b.dataset.val);
        } else {
          b.classList.toggle('sel');
          if (selected.has(b.dataset.val)) selected.delete(b.dataset.val); else selected.add(b.dataset.val);
        }
      });
    });

    el('#obBack')?.addEventListener('click', () => { save(q, selected); i -= 1; render(); });
    el('#obNext').addEventListener('click', () => {
      save(q, selected);
      if (!q.optional && q.type !== 'text' && selected.size === 0) {
        // Nudge but don't block — some people want to move on.
        i += 1; render(); return;
      }
      i += 1; render();
    });
  }

  function save(q, selected) {
    if (q.type === 'text') {
      const v = el('#obtext')?.value.trim();
      if (v) answers[q.id] = v; else delete answers[q.id];
    } else if (q.type === 'single') {
      answers[q.id] = [...selected][0] || undefined;
    } else {
      answers[q.id] = [...selected];
    }
  }

  function finish() {
    store.completeOnboarding(profile.id, answers);
    applyMotion(store.activeProfile());
    mount(`
      <div class="wrap">
        <div class="card fade-in center">
          <span class="brand-mark big">🌿</span>
          <h2>Thank you, ${esc(profile.name)}.</h2>
          <p class="muted">I’ll keep learning what helps you most every time we check in. I’m here whenever you need me.</p>
          <button class="btn btn-primary btn-lg" id="toHome">Go to my helper</button>
        </div>
      </div>`);
    el('#toHome').addEventListener('click', () => screenHome(store.activeProfile()));
  }

  intro();
}

// ---------------------------------------------------------------------------
// Home / dashboard
// ---------------------------------------------------------------------------
function screenHome(profile) {
  applyMotion(profile);
  const insight = dailyInsight(profile);
  const profiles = store.listProfiles();
  const doneToday = store.completedToday(profile);

  const switcher = profiles.length > 1
    ? `<button class="chip-btn" id="switch">${esc(profile.name)} ▾</button>`
    : `<button class="chip-btn" id="addProfile">+ Add profile</button>`;

  mount(`
    <div class="wrap home">
      <header class="home-head">
        <div>
          <p class="greeting">${greeting()}</p>
          <h1>${esc(profile.name)}</h1>
        </div>
        <div class="head-actions">
          ${switcher}
          <button class="icon-btn" id="settings" aria-label="Settings">⚙️</button>
        </div>
      </header>

      <section class="insight insight-${insight.tone} fade-in">
        <h2>${esc(insight.headline)}</h2>
        <p>${esc(insight.body)}</p>
        ${(insight.streak > 1 && insight.tone !== 'tender') ? `<p class="streak">🔥 ${insight.streak}-day streak of showing up for yourself</p>` : ''}
      </section>

      <div class="home-actions">
        <button class="big-action primary" id="checkin">
          <span class="ba-title">${doneToday ? 'Check in again' : 'Daily check-in'}</span>
          <span class="ba-sub">${profile.band === 'child' ? 'How are you feeling?' : 'Five quick questions + how you feel today'}</span>
        </button>
        <button class="big-action help" id="helpNow">
          <span class="ba-title">I need help right now</span>
          <span class="ba-sub">A quick check, then we calm together</span>
        </button>
      </div>

      ${insight.suggestTechnique ? `<p class="suggest muted">💡 ${esc(insight.suggestReason)}</p>` : ''}

      ${historyStrip(profile)}
    </div>`);

  el('#checkin').addEventListener('click', () => screenCheckin(profile, false));
  el('#helpNow').addEventListener('click', () => screenCheckin(profile, true));
  el('#settings').addEventListener('click', () => screenSettings(profile));
  el('#addProfile')?.addEventListener('click', () => screenCreateProfile(false));
  el('#switch')?.addEventListener('click', () => screenSwitcher(profile));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

function historyStrip(profile) {
  // On a low-stimulation setup, keep the home quiet — no chart of past days.
  if (profile.prefs?.reducedMotion) return '';
  const recs = store.recentRecords(profile, 10).filter((r) => r.pre);
  if (!recs.length) return '';
  const bars = recs.map((r) => {
    const s = store.stateScore(r.pre.overall, r.pre.scores);
    const h = Math.max(8, Math.round((s / 10) * 100));
    const win = r.result?.win;
    return `<div class="hbar" title="${r.date}: ${Math.round(s)}/10${win ? ' · win' : ''}">
      <div class="hbar-fill${win ? ' win' : ''}" style="height:${h}%"></div></div>`;
  }).join('');
  return `<section class="history">
    <h3>Recent days</h3>
    <div class="hbars">${bars}</div>
    <p class="muted tiny">How you felt at check-in. Green = a session that helped by 10%+.</p>
  </section>`;
}

function screenSwitcher(current) {
  const profiles = store.listProfiles();
  mount(`
    <div class="wrap">
      <div class="card">
        <h2>Who’s checking in?</h2>
        <div class="profile-list">
          ${profiles.map((p) => `<button class="profile-row${p.id === current.id ? ' sel' : ''}" data-id="${p.id}">
            <span class="pr-name">${esc(p.name)}</span>
            <span class="pr-meta muted">${p.band}</span></button>`).join('')}
        </div>
        <button class="btn btn-ghost" id="addP">+ Add another profile</button>
        <button class="btn btn-ghost" id="back">Back</button>
      </div>
    </div>`);
  app.querySelectorAll('.profile-row').forEach((b) =>
    b.addEventListener('click', () => {
      store.setActiveProfile(b.dataset.id);
      const p = store.activeProfile();
      if (!p.onboarded) screenOnboarding(p); else screenHome(p);
    })
  );
  el('#addP').addEventListener('click', () => screenCreateProfile(false));
  el('#back').addEventListener('click', () => screenHome(current));
}

// ---------------------------------------------------------------------------
// Check-in (pre and post share this renderer)
// ---------------------------------------------------------------------------
function screenCheckin(profile, forceHelp, mode = 'pre', onDone = null, quick = false) {
  const cfg = CHECKIN[profile.band] || CHECKIN.adult;
  const answers = {};
  let overall = null;
  let quickMode = quick; // only the 1-10 asked; for heavy days when 5 is too many
  const child = profile.band === 'child';

  const questionsHtml = cfg.questions.map((q, i) => `
    <div class="q" data-q="${q.id}">
      <p class="q-text">${esc(q.text)}</p>
      <div class="scale" role="radiogroup" aria-label="${esc(q.text)}">
        ${scaleButtons(q, child, cfg)}
      </div>
    </div>`).join('');

  const overallHtml = child
    ? `<div class="q overall">
         <p class="q-text">${esc(cfg.overallPrompt)}</p>
         <div class="faces">${cfg.faces.map((f, i) => `<button class="face-pick" type="button" data-v="${(i + 1) * 2}">${f}</button>`).join('')}</div>
         <p class="muted tiny">${esc(cfg.overallHint)}</p>
       </div>`
    : `<div class="q overall">
         <p class="q-text">${esc(cfg.overallPrompt)}</p>
         <div class="scale ten" role="radiogroup" aria-label="overall">
           ${Array.from({ length: 10 }, (_, k) => `<button class="dot" type="button" data-v="${k + 1}">${k + 1}</button>`).join('')}
         </div>
         <p class="muted tiny">${esc(cfg.overallHint)}</p>
       </div>`;

  mount(`
    <div class="wrap checkin">
      <header class="mini-head">
        ${mode === 'post' ? '<span class="icon-spacer"></span>' : '<button class="icon-btn" id="back" aria-label="Back">←</button>'}
        <h2>${mode === 'post' ? 'How do you feel now?' : (child ? 'Feelings check' : 'Daily check-in')}</h2>
        <span></span>
      </header>
      ${mode === 'post' ? '' : `<p class="muted center">${child ? 'Let’s see how you’re feeling.' : 'Answer however feels true right now. There are no wrong answers.'}</p>`}
      <div class="questions${quickMode ? ' quickmode' : ''}">
        ${overallHtml}
        ${questionsHtml}
      </div>
      ${(!child && !quickMode) ? '<button class="linklike" id="quick" type="button">Too much right now? Just the one question →</button>' : ''}
      <button class="btn btn-primary btn-lg" id="submit" disabled>${mode === 'post' ? 'See my result' : 'Done'}</button>
    </div>`);

  // Wire the five question scales.
  app.querySelectorAll('.q').forEach((qEl) => {
    const qid = qEl.dataset.q;
    qEl.querySelectorAll('[data-v]').forEach((b) =>
      b.addEventListener('click', () => {
        qEl.querySelectorAll('[data-v]').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
        if (qEl.classList.contains('overall')) overall = Number(b.dataset.v);
        else answers[qid] = Number(b.dataset.v);
        maybeEnable();
      })
    );
  });

  function maybeEnable() {
    const allQ = quickMode || cfg.questions.every((q) => answers[q.id] != null);
    el('#submit').disabled = !(overall != null && allQ);
  }

  el('#quick')?.addEventListener('click', () => {
    quickMode = true;
    app.querySelector('.questions').classList.add('quickmode');
    el('#quick').remove();
    maybeEnable();
  });
  el('#back')?.addEventListener('click', () => screenHome(profile));
  el('#submit').addEventListener('click', () => {
    const pre = { overall, scores: answers };
    if (mode === 'post') return onDone(pre);
    handlePre(profile, pre, forceHelp, quickMode);
  });
}

function scaleButtons(q, child, cfg) {
  const n = child ? 5 : 5;
  const labels = `<span class="scale-end left">${esc(q.low)}</span><span class="scale-end right">${esc(q.high)}</span>`;
  const btns = Array.from({ length: n }, (_, k) =>
    `<button class="tick" type="button" data-v="${k + 1}" aria-label="${k + 1} of ${n}">${child ? (cfg.faces ? cfg.faces[k] : k + 1) : ''}</button>`
  ).join('');
  return `${labels}<div class="ticks">${btns}</div>`;
}

// Decide what happens after the pre check-in.
function handlePre(profile, pre, forceHelp, quick = false) {
  const record = store.startCheckin(profile.id, pre, forceHelp || store.needsHelp(pre.overall, pre.scores));
  const help = forceHelp || store.needsHelp(pre.overall, pre.scores);

  if (!help) {
    // Feeling okay — affirm, log, and offer an optional top-up.
    return screenOkay(profile, record, pre);
  }
  // Build the personalised plan and show a soft "let's help you" lead-in.
  const ids = buildSession(profile, pre);
  flow = { profile, record, pre, ids, quick };
  screenLeadIn(profile, pre, ids);
}

function screenOkay(profile, record, pre) {
  // Close the record with an equal post (no session) so history stays clean.
  store.finishCheckin(profile.id, record.id, pre);
  const child = profile.band === 'child';
  mount(`
    <div class="wrap">
      <div class="card center fade-in">
        <span class="brand-mark big">🌤️</span>
        <h2>${child ? 'Yay! You’re feeling good.' : 'Glad you’re feeling steady today.'}</h2>
        <p class="muted">${child ? 'Want to play a calm game anyway?' : 'Logged. Want a short calm moment anyway, or a game to unwind?'}</p>
        <button class="btn btn-primary btn-lg" id="topup">${child ? 'Play a calm game' : 'A little calm anyway'}</button>
        <button class="btn btn-ghost" id="home">Back home</button>
      </div>
    </div>`);
  el('#topup').addEventListener('click', () => {
    const ids = buildSession(profile, pre).slice(0, 3);
    flow = { profile, record, pre, ids, optional: true };
    startSession();
  });
  el('#home').addEventListener('click', () => screenHome(profile));
}

function screenLeadIn(profile, pre, ids) {
  const plan = describePlan(ids);
  const child = profile.band === 'child';
  mount(`
    <div class="wrap">
      <div class="card center fade-in help-lead">
        <div class="breathe-dot" aria-hidden="true"></div>
        <h2>${child ? 'Let’s feel better together.' : 'Okay. Let’s help you.'}</h2>
        <p class="lede">${child
          ? 'We’ll do some cozy calm-down things. Ready?'
          : 'I’ve put together about ' + plan.minutes + ' minutes, just for you. Nothing to decide, nothing to fix — I’ll guide each step.'}</p>
        ${child ? '' : `<p class="muted tiny plan-list">${plan.titles.map(esc).join(' · ')}</p>`}
        <button class="btn btn-primary btn-lg" id="go">${child ? 'Let’s go' : 'I’m ready'}</button>
        <button class="btn btn-ghost" id="skip">Not right now</button>
      </div>
    </div>`);
  el('#go').addEventListener('click', () => startSession());
  el('#skip').addEventListener('click', () => {
    store.finishCheckin(profile.id, flow.record.id, pre); // no improvement recorded
    screenHome(profile);
  });
}

// ---------------------------------------------------------------------------
// Guided session + post assessment + result
// ---------------------------------------------------------------------------
function startSession() {
  const { profile, record, pre, ids } = flow;
  mount('<div class="wrap session-wrap"><div id="sessionRoot"></div></div>');
  const rootEl = document.getElementById('sessionRoot');
  runGuidedSession(rootEl, profile, ids, {
    onDone: (session) => {
      store.attachSession(profile.id, record.id, session);
      // Post check-in reuses the check-in renderer in 'post' mode, mirroring the
      // quick/full choice made at the start so before/after stay comparable.
      screenCheckin(profile, false, 'post', (post) => finishAndShow(post), flow.quick);
    },
  });
}

function finishAndShow(post) {
  const { profile, record, optional } = flow;
  const rec = store.finishCheckin(profile.id, record.id, post);
  screenResult(profile, rec, optional);
}

function screenResult(profile, rec, optional) {
  const r = rec.result;
  const child = profile.band === 'child';
  const win = r.win;
  const improved = r.deltaPoints > 0;

  let title, body, emoji;
  if (win) {
    emoji = '🌟';
    title = child ? 'You did it! You feel better!' : 'That’s a win.';
    body = child
      ? 'Your feeling got calmer. So proud of you!'
      : `You lifted from ${r.preScore} to ${r.postScore} — that’s ${r.improvementPct}% better. Real, and worth noticing.`;
  } else if (improved) {
    emoji = '🌱';
    title = child ? 'A little bit better!' : 'A little lighter.';
    body = child
      ? 'Your feeling got a bit softer. That counts.'
      : `You moved from ${r.preScore} to ${r.postScore}. Even a small shift matters — you did that.`;
  } else {
    emoji = '🤍';
    title = child ? 'Thank you for trying.' : 'You showed up, and that counts.';
    body = child
      ? 'Some feelings need more time. You’re not alone.'
      : 'The number didn’t move much this time, and that’s okay — some waves take longer to pass. You didn’t face it alone, and that matters. Would another few minutes help?';
  }

  mount(`
    <div class="wrap">
      <div class="card center fade-in result ${win ? 'win' : improved ? 'up' : 'flat'}">
        <div class="result-emoji">${emoji}</div>
        <h2>${title}</h2>
        <p class="lede">${body}</p>
        ${(!child && r.deltaPoints > 0) ? `<div class="result-meter">
            <div class="rm-row"><span>Before</span><div class="rm-bar"><div style="width:${(r.preScore / 10) * 100}%"></div></div><b>${r.preScore}</b></div>
            <div class="rm-row"><span>After</span><div class="rm-bar after"><div style="width:${(r.postScore / 10) * 100}%"></div></div><b>${r.postScore}</b></div>
          </div>` : ''}
        <div class="result-actions">
          ${!win ? '<button class="btn btn-primary" id="again">A few more minutes</button>' : ''}
          <button class="btn ${win ? 'btn-primary' : 'btn-ghost'} btn-lg" id="home">${child ? 'All done' : 'I’m okay for now'}</button>
        </div>
      </div>
    </div>`);
  el('#home').addEventListener('click', () => screenHome(profile));
  el('#again')?.addEventListener('click', () => {
    // Fresh short session using the post scores as the new baseline.
    const ids = buildSession(profile, rec.post).slice(0, 3);
    const record = store.startCheckin(profile.id, rec.post, true);
    flow = { profile, record, pre: rec.post, ids };
    startSession();
  });
}

// ---------------------------------------------------------------------------
// Settings & privacy
// ---------------------------------------------------------------------------
function screenSettings(profile) {
  mount(`
    <div class="wrap">
      <header class="mini-head">
        <button class="icon-btn" id="back" aria-label="Back">←</button>
        <h2>Settings</h2><span></span>
      </header>
      <div class="card">
        <h3>${esc(profile.name)}</h3>
        <label class="toggle">
          <input type="checkbox" id="rm" ${profile.prefs.reducedMotion ? 'checked' : ''}/>
          <span>Reduce motion — keep animations still</span>
        </label>
        <button class="btn btn-ghost" id="redo">Redo my questions</button>
      </div>
      <div class="card">
        <h3>Your privacy</h3>
        <p class="muted">Everything stays on this device, in this browser only. Nothing is uploaded, tracked, or shared. Clearing your browser data will erase it.</p>
        <button class="btn btn-ghost" id="delProfile">Delete this profile</button>
        <button class="btn btn-danger" id="wipe">Erase everything</button>
      </div>
      <p class="muted tiny center">calm me down · a private, offline helper · not a medical device</p>
    </div>`);
  el('#back').addEventListener('click', () => screenHome(profile));
  el('#rm').addEventListener('change', (e) => {
    store.updatePrefs(profile.id, { reducedMotion: e.target.checked });
    applyMotion(store.activeProfile());
  });
  el('#redo').addEventListener('click', () => screenOnboarding(profile));
  el('#delProfile').addEventListener('click', () => {
    if (confirm(`Delete ${profile.name}’s profile and history? This can’t be undone.`)) {
      store.deleteProfile(profile.id);
      start();
    }
  });
  el('#wipe').addEventListener('click', () => {
    if (confirm('Erase ALL profiles and history on this device? This cannot be undone.')) {
      store.wipeEverything();
      start();
    }
  });
}

// Expose for the inline bootstrap in index.html.
window.__calm = { start };
