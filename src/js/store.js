// store.js
// All state lives on the device (localStorage). Nothing is sent anywhere.
// This keeps deeply personal check-in data private and lets the app work
// offline. The store also holds the small scoring + adaptation math so the
// rest of the app stays declarative.

import { ageBandFor, TECHNIQUES } from './content.js';

const KEY = 'calmmedown.v1';

const EMPTY = { version: 1, activeProfileId: null, profiles: {} };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.profiles) return structuredClone(EMPTY);
    return data;
  } catch {
    return structuredClone(EMPTY);
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Storage full or blocked (e.g. private mode). Fail soft — the app keeps
    // working for this session even if it can't persist.
    console.warn('calmmedown: could not save state', e);
  }
}

let state = load();

function id() {
  // No Math.random dependency assumptions; time + counter is plenty unique here.
  return 'p_' + Date.now().toString(36) + '_' + (id._n = (id._n || 0) + 1).toString(36);
}

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// --- Profiles --------------------------------------------------------------

export function getState() {
  return state;
}

export function listProfiles() {
  return Object.values(state.profiles).sort((a, b) => a.createdAt - b.createdAt);
}

export function activeProfile() {
  return state.activeProfileId ? state.profiles[state.activeProfileId] || null : null;
}

export function setActiveProfile(pid) {
  state.activeProfileId = pid;
  save(state);
}

export function createProfile({ name, age, sex }) {
  const pid = id();
  const band = ageBandFor(age);
  const profile = {
    id: pid,
    name: String(name || '').trim() || 'Friend',
    age: Number(age) || null,
    sex: sex || null,
    band,
    createdAt: Date.now(),
    onboarding: {},
    onboarded: false,
    prefs: { reducedMotion: false, sound: false },
    // Effectiveness weight per technique. Starts neutral; adaptation nudges it.
    weights: Object.fromEntries(TECHNIQUES.map((t) => [t.id, 1])),
    history: [],
    lastCheckinDate: null,
  };
  state.profiles[pid] = profile;
  state.activeProfileId = pid;
  save(state);
  return profile;
}

export function completeOnboarding(pid, answers) {
  const p = state.profiles[pid];
  if (!p) return;
  p.onboarding = answers || {};
  p.onboarded = true;
  // Honour the reduced-motion preference chosen during onboarding.
  if (answers && (answers.motion === 'reduced')) p.prefs.reducedMotion = true;
  save(state);
}

export function updatePrefs(pid, patch) {
  const p = state.profiles[pid];
  if (!p) return;
  p.prefs = { ...p.prefs, ...patch };
  save(state);
}

export function deleteProfile(pid) {
  delete state.profiles[pid];
  if (state.activeProfileId === pid) {
    state.activeProfileId = listProfiles()[0]?.id || null;
  }
  save(state);
}

export function wipeEverything() {
  state = structuredClone(EMPTY);
  save(state);
}

// --- Scoring ---------------------------------------------------------------
// composite: average of the 1..5 question scores, normalised to 0..10 so it's
// directly comparable to the headline "how do you feel" 1..10.

export function composite(scores) {
  const vals = Object.values(scores || {}).map(Number).filter((n) => Number.isFinite(n));
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length; // 1..5
  return ((avg - 1) / 4) * 10; // -> 0..10
}

// A single "state of mind" number blending the headline feeling with the five
// questions. The headline is weighted a little heavier because the user said it
// is the primary signal.
export function stateScore(overall, scores) {
  const c = composite(scores);
  if (c == null) return overall;
  return overall * 0.6 + c * 0.4;
}

// Decide whether a check-in should tip into "let's help you" mode.
export function needsHelp(overall, scores) {
  if (overall <= 3) return true;
  const s = stateScore(overall, scores);
  return s <= 4; // low blended state even if the headline number was generous
}

// Win test: improved by more than 10%. We compare the blended state score
// (falls back to the headline). Guard against divide-by-zero on very low pre.
export function evaluateResult(pre, post) {
  const preS = stateScore(pre.overall, pre.scores);
  const postS = stateScore(post.overall, post.scores);
  const base = Math.max(preS, 0.5); // avoid explosive/degenerate percentages
  const pct = ((postS - base) / base) * 100;
  return {
    preScore: round1(preS),
    postScore: round1(postS),
    deltaPoints: round1(postS - preS),
    improvementPct: Math.round(pct),
    win: pct > 10,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// --- Check-in records ------------------------------------------------------

export function startCheckin(pid, pre, triggeredHelp) {
  const p = state.profiles[pid];
  if (!p) return null;
  const record = {
    id: 'c_' + Date.now().toString(36),
    date: todayKey(),
    at: Date.now(),
    pre,
    triggeredHelp: Boolean(triggeredHelp),
    session: null,
    post: null,
    result: null,
  };
  p.history.push(record);
  p.lastCheckinDate = record.date;
  save(state);
  return record;
}

export function attachSession(pid, recordId, session) {
  const p = state.profiles[pid];
  const rec = p?.history.find((r) => r.id === recordId);
  if (!rec) return;
  rec.session = session; // { techniques:[ids], ratings:{id:'up'|'down'} }
  save(state);
}

export function finishCheckin(pid, recordId, post) {
  const p = state.profiles[pid];
  const rec = p?.history.find((r) => r.id === recordId);
  if (!rec) return null;
  rec.post = post;
  rec.result = evaluateResult(rec.pre, post);
  applyAdaptation(p, rec);
  save(state);
  return rec;
}

// --- Adaptation ------------------------------------------------------------
// Learn which techniques help THIS person. After a session we nudge the weight
// of each technique used, by how much the state improved and any thumbs rating.
// Exponential-ish smoothing keeps it stable and reversible over time.

function applyAdaptation(profile, rec) {
  if (!rec.session || !rec.result) return;
  const gained = rec.result.deltaPoints; // points on 0..10
  const norm = clamp(gained / 4, -1, 1); // ~4 pts of gain == strong signal
  const ratings = rec.session.ratings || {};
  for (const tid of rec.session.techniques) {
    const thumb = ratings[tid] === 'up' ? 0.4 : ratings[tid] === 'down' ? -0.5 : 0;
    const delta = 0.25 * norm + thumb;
    const cur = profile.weights[tid] ?? 1;
    profile.weights[tid] = clamp(cur + delta, 0.2, 3);
  }
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// --- History helpers for the daily "what you need today" card --------------

export function recentRecords(profile, n = 14) {
  return profile.history.slice(-n);
}

export function completedToday(profile) {
  const t = todayKey();
  return profile.history.some((r) => r.date === t && r.post);
}

export function streak(profile) {
  // Consecutive days (up to today) with any check-in.
  const days = new Set(profile.history.map((r) => r.date));
  let s = 0;
  const d = new Date();
  for (;;) {
    if (days.has(todayKey(d))) {
      s += 1;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return s;
}

// Persist any external mutation (used after tweaks in memory).
export function persist() {
  save(state);
}
