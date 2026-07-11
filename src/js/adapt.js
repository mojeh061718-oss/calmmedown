// adapt.js
// The "little helper" brain. Two jobs:
//   1) buildSession()  — assemble a personalised ~10-minute calm session that
//      adapts to age, onboarding answers, how low the person is right now, and
//      what has worked for them before.
//   2) dailyInsight()  — read recent history and decide what the person likely
//      needs today, plus a gentle, cause-agnostic heads-up if the last few days
//      have been heavier than usual.

import { TECHNIQUES, techniqueById } from './content.js';
import { stateScore, recentRecords, streak, composite } from './store.js';

// Rough target length for the guided session, in seconds (~10 minutes).
const TARGET_SECONDS = 600;
const CHILD_TARGET_SECONDS = 300;

// Two "lanes" of regulation. Some people (and some moments) are helped by
// settling INWARD — breath, stillness, quiet. Others — including many people
// whose "go-to" breathing tricks backfire — are helped by going OUTWARD: moving,
// getting outside into the light, and absorbing distraction. The onboarding
// `style` answer sets which lane we lead with; the app still learns per person.
const LANE = {
  'physiological-sigh': 'inward', 'box-breathing': 'inward', 'pmr': 'inward',
  'affect-labeling': 'inward', 'self-compassion': 'inward', 'safe-anchor': 'inward',
  'game-breath-orb': 'inward',
  'cold-reset': 'outward', 'sunlight': 'outward', 'walk-it-out': 'outward',
  'nourish': 'outward', 'word-search': 'outward', 'game-match': 'outward',
  'grounding-54321': 'neutral', 'game-ripples': 'neutral',
};

// Ordering slot (what job a technique does in the arc), separate from its
// render `kind`.
const SLOT = {
  'physiological-sigh': 'breath', 'box-breathing': 'breath', 'game-breath-orb': 'breath',
  'cold-reset': 'reset', 'grounding-54321': 'ground', 'pmr': 'body',
  'affect-labeling': 'label', 'self-compassion': 'compassion', 'safe-anchor': 'anchor',
  'sunlight': 'outside', 'walk-it-out': 'walk', 'nourish': 'nourish',
  'word-search': 'game', 'game-ripples': 'game', 'game-match': 'game',
  'child-buddy-breath': 'child-breath', 'child-flower-candle': 'child-breath',
  'child-cloud': 'child-breath', 'child-star': 'child-game', 'child-bubbles': 'child-game',
  'child-feelings': 'child-feelings', 'child-parade': 'child-move',
  'child-pop': 'child-game', 'child-colortap': 'child-game', 'child-scribble': 'child-feelings',
};

const slotOf = (id) => SLOT[id] || 'other';
const laneOf = (id) => LANE[id] || 'neutral';

// Score every candidate technique for this person + this moment, then greedily
// pick a well-rounded sequence up to the time budget.
export function buildSession(profile, pre) {
  const band = profile.band;
  const ob = profile.onboarding || {};
  const style = ob.style || 'mixed'; // 'inward' | 'outward' | 'mixed'
  const severe = pre.overall <= 2 || stateScore(pre.overall, pre.scores) <= 3;
  const target = band === 'child' ? CHILD_TARGET_SECONDS : TARGET_SECONDS;

  const candidates = TECHNIQUES.filter((t) => t.bands.includes(band));

  const scored = candidates.map((t) => {
    let score = profile.weights?.[t.id] ?? 1; // learned effectiveness
    if (severe && t.severityFit === 'high') score += 1.2;
    if (!severe && t.severityFit === 'low') score += 0.3;
    if (typeof t.matches === 'function' && t.matches(ob)) score += 0.8;
    // Lane preference: lean hard into the lane this person says helps, and pull
    // back the other one (breathing/stillness for someone it backfires on).
    const lane = laneOf(t.id);
    if (style === 'outward') { if (lane === 'outward') score += 1.1; if (lane === 'inward') score -= 1.3; }
    if (style === 'inward') { if (lane === 'inward') score += 1.0; if (lane === 'outward') score -= 0.7; }
    score += freshnessBoost(profile, t.id);
    return { t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // The arc of the session, as ordered slots, depends on the person's lane.
  const wantOrder = band === 'child'
    ? ['child-move', 'child-breath', 'child-game', 'child-feelings', 'child-breath']
    : style === 'outward'
      ? ['outside', 'game', 'walk', 'ground', 'nourish', 'body']
      : style === 'inward'
        ? ['breath', 'ground', 'game', 'label', 'compassion', 'body', 'anchor']
        : ['outside', 'breath', 'game', 'ground', 'walk', 'compassion'];

  const chosen = [];
  let used = 0;
  const take = (t) => {
    if (!t || chosen.includes(t)) return false;
    if (used + (t.durationSec || 90) > target + 90) return false;
    chosen.push(t);
    used += t.durationSec || 90;
    return true;
  };

  // Severe: guarantee a fast opener that fits the person's lane. For outward
  // folks that means getting them up/out or a physical reset — NOT sitting to
  // breathe, which several told us pressure-cooks them.
  if (severe) {
    const openers = band === 'child'
      ? ['child-parade', 'child-pop', 'child-cloud', 'child-buddy-breath']
      : style === 'outward'
        ? ['sunlight', 'walk-it-out', 'cold-reset', 'word-search']
        : ['physiological-sigh', 'cold-reset', 'grounding-54321'];
    for (const id of openers) {
      const s = scored.find((x) => x.t.id === id);
      if (s) { take(s.t); break; }
    }
  }

  for (const slot of wantOrder) {
    if (used >= target) break;
    const pick = scored.find((s) => slotOf(s.t.id) === slot && !chosen.includes(s.t));
    if (pick) take(pick.t);
  }

  for (const s of scored) {
    if (used >= target) break;
    take(s.t);
  }

  // End on a note that fits the lane. Inward folks land on something soft;
  // outward folks land having moved / stepped into the light — not on stillness
  // (which, for them, undoes the session).
  const endSlots = band === 'child'
    ? ['child-feelings', 'child-breath']
    : style === 'outward'
      ? ['walk', 'outside', 'nourish', 'ground']
      : style === 'inward'
        ? ['compassion', 'anchor', 'breath', 'label']
        : ['ground', 'compassion', 'walk', 'breath'];
  const lastOk = endSlots.includes(slotOf(chosen[chosen.length - 1]?.id));
  if (!lastOk) {
    const idx = chosen.findIndex((t) => endSlots.includes(slotOf(t.id)));
    if (idx >= 0) chosen.push(chosen.splice(idx, 1)[0]);
  }

  return chosen.map((t) => t.id);
}

// Gently rotate technique selection so a person doesn't get the identical
// session every time. Techniques used in the last couple of sessions get a
// small negative nudge.
function freshnessBoost(profile, tid) {
  const recent = recentRecords(profile, 3);
  const usedRecently = recent.some((r) => r.session?.techniques?.includes(tid));
  return usedRecently ? -0.35 : 0.15;
}

// ---------------------------------------------------------------------------
// Daily insight — the "what you need today" card.
// ---------------------------------------------------------------------------
export function dailyInsight(profile) {
  const recs = recentRecords(profile, 21).filter((r) => r.pre);
  const done = streak(profile);

  if (recs.length === 0) {
    return {
      tone: 'welcome',
      headline: `Welcome, ${profile.name}.`,
      body: 'Whenever you’re ready, a quick check-in helps me learn how to be here for you. It only takes a minute.',
      suggestTechnique: null,
      streak: done,
    };
  }

  const scores = recs.map((r) => stateScore(r.pre.overall, r.pre.scores));
  const avgAll = mean(scores);
  const recent = scores.slice(-4);
  const avgRecent = mean(recent);
  const trendingDown = recent.length >= 3 && avgRecent < avgAll - 0.8;
  const heavyStretch = recent.length >= 3 && avgRecent <= 4;

  // Which technique has served this person best?
  const best = bestTechnique(profile);

  let tone = 'steady';
  let headline = `Good to see you, ${profile.name}.`;
  let body = 'A quick check-in keeps me tuned to how you’re doing today.';

  if (heavyStretch || trendingDown) {
    // Cause-agnostic, never labels why. Just: I notice, and I've got you.
    tone = 'tender';
    headline = 'The last few days have felt heavier.';
    body = 'That’s allowed, and it isn’t forever. I’ve set today up to be extra gentle — nothing here needs to be earned. Let’s just take it slow together.';
  } else if (avgRecent >= 7) {
    tone = 'bright';
    headline = 'You’ve been in a good stretch.';
    body = 'Nice. A quick check-in helps us keep the streak of good days going and notice early if anything shifts.';
  }

  return {
    tone,
    headline,
    body,
    suggestTechnique: best ? best.id : null,
    suggestReason: best ? best.reason : null,
    streak: done,
  };
}

function bestTechnique(profile) {
  const entries = Object.entries(profile.weights || {})
    .filter(([id]) => techniqueById(id) && techniqueById(id).bands.includes(profile.band))
    .sort((a, b) => b[1] - a[1]);
  // Only surface a favourite once there's a bit of signal (weight moved off 1).
  const top = entries[0];
  if (!top || top[1] <= 1.15) return null;
  const t = techniqueById(top[0]);
  return { id: t.id, reason: `“${t.title}” has helped you the most so far.` };
}

function mean(a) {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}

// A short human summary of a session plan for the pre-session screen.
export function describePlan(ids) {
  const titles = ids.map((id) => techniqueById(id)?.title).filter(Boolean);
  const total = ids.reduce((s, id) => s + (techniqueById(id)?.durationSec || 0), 0);
  return { titles, minutes: Math.max(1, Math.round(total / 60)) };
}

export { composite };
