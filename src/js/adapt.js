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

// Score every candidate technique for this person + this moment, then greedily
// pick a well-rounded sequence up to the time budget.
export function buildSession(profile, pre) {
  const band = profile.band;
  const ob = profile.onboarding || {};
  const severe = pre.overall <= 2 || stateScore(pre.overall, pre.scores) <= 3;
  const target = band === 'child' ? CHILD_TARGET_SECONDS : TARGET_SECONDS;

  const candidates = TECHNIQUES.filter((t) => t.bands.includes(band));

  const scored = candidates.map((t) => {
    let score = profile.weights?.[t.id] ?? 1; // learned effectiveness
    // In severe moments, front-load the fast body-based tools.
    if (severe && t.severityFit === 'high') score += 1.2;
    if (!severe && t.severityFit === 'low') score += 0.3;
    // Onboarding preferences.
    if (typeof t.matches === 'function' && t.matches(ob)) score += 0.8;
    // A little variety so the same three don't always win.
    score += freshnessBoost(profile, t.id);
    return { t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Build a balanced arc: settle the body → ground → occupy the mind (a game)
  // → soften self-talk. We pull the best-scoring technique available for each
  // slot, then fill remaining time with the next best, respecting the budget.
  const wantOrder = band === 'child'
    ? ['child-breath', 'game', 'child-feelings', 'child-breath']
    : ['breath', 'grounding', 'game', 'label', 'compassion', 'body', 'anchor'];

  const chosen = [];
  let used = 0;
  const take = (t) => {
    if (!t || chosen.includes(t)) return false;
    if (used + t.durationSec > target + 90) return false; // small overshoot ok
    chosen.push(t);
    used += t.durationSec;
    return true;
  };

  // Severe: guarantee a fast downregulator first (sigh or cold reset).
  if (severe && band !== 'child') {
    const fast = scored.find((s) => ['physiological-sigh', 'cold-reset'].includes(s.t.id));
    if (fast) take(fast.t);
  }

  for (const kind of wantOrder) {
    if (used >= target) break;
    const pick = scored.find((s) => s.t.kind === kind && !chosen.includes(s.t));
    if (pick) take(pick.t);
  }

  // Fill any leftover time with the next best-scoring, not-yet-used technique.
  for (const s of scored) {
    if (used >= target) break;
    take(s.t);
  }

  // Always end on something soft rather than a game, when possible.
  const softKinds = band === 'child' ? ['child-feelings', 'child-breath'] : ['compassion', 'anchor', 'label', 'breath'];
  const lastIsSoft = softKinds.includes(chosen[chosen.length - 1]?.kind);
  if (!lastIsSoft) {
    const softIdx = chosen.findIndex((t) => softKinds.includes(t.kind));
    if (softIdx >= 0) {
      const [soft] = chosen.splice(softIdx, 1);
      chosen.push(soft);
    }
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
