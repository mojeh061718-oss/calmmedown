# calm me down

A private, offline **companion for the hard moments** — the times when a person
feels out of control, goes blank, or gets swept into feelings that aren’t really
them. It gets to know each person through a gentle onboarding, checks in with
them each day, and when a day is heavy it guides them through a short,
research-backed calming session — then measures whether it actually helped.

It is built for **everyone in the household**, and it quietly adapts to each
person by their age and what they tell it. An adult and a four-year-old get
completely different questions, techniques, and language from the same app.

> This is a supportive self-care tool, **not** a medical device, diagnosis, or a
> replacement for professional care. If someone is in crisis or thinking about
> harming themselves, contact local emergency services or a crisis line (in the
> US, call or text **988**).

---

## What it does

**Profiles, per person.** Onboards with a name, age, and sex, then runs an
extensive but gentle interview to learn how *this specific person* tips into
hard moments and what helps them come back. Multiple profiles live side by side
and you switch between them in a tap.

**A daily check-in.** Five soft questions plus the headline *“how do you feel
today, if 10 was the best in the world?”* When the number is low (3 or below, or
the five questions paint a low picture), the app slides into **“let’s help
you”** mode. There’s also an always-available **“I need help right now”** button
for when a mood arrives out of nowhere.

**A ~10-minute guided session.** Personalised each time. It settles the body
first (because when someone is flooded, *words don’t land* — the body has to
calm before the mind can), then grounds the senses, then occupies the mind with
a gentle focus game, then softens the inner voice. Every step is one thing on
the screen, slow, and calm.

**A focus game in the middle.** Small, non-overstimulating, no score, no timer,
no way to lose — just enough to pull attention out of the spiral. (Follow-the-
breath light, still water ripples, gentle memory pairs, star-breathing for
little ones.)

**It measures the win.** The same check-in is given at the end. If the person’s
state improves by **more than 10%**, it’s celebrated as a win. Smaller lifts are
honoured too, and if nothing moved, it says so kindly and offers a few more
minutes.

**It adapts over time.** The app learns which techniques help *this* person
(from the before/after change and an optional thumbs-up) and offers those more.
Each day it reads recent history and decides what the person likely needs — and
if the last few days have been heavier than usual, it gently pre-positions extra
softness, **without ever naming a cause.**

**For a young child**, everything changes: a grown-up sets up the child’s
favourite animal and colour, the check-in becomes faces, and the session becomes
buddy-belly-breaths, “smell the flower / blow the candle,” star breathing, and
naming feelings with pictures.

---

## Privacy

Everything lives **only on the device, in the browser** (localStorage). Nothing
is uploaded, tracked, analysed remotely, or shared with anyone — there is no
server and no account. This matters: check-in data is deeply personal. Clearing
the browser’s data (or using the in-app *Erase everything*) removes it for good.

---

## Running it

It’s a static, dependency-free web app (plain HTML/CSS/JS modules + a service
worker for offline use). No build step.

**Locally**

```bash
# from the project root — any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

(Open it via a server, not by double-clicking the file — browsers block ES
modules and service workers on `file://`.)

**On a phone (recommended).** Host the folder anywhere static — **GitHub Pages**
is the easiest since this is already a repo:

1. Push to GitHub.
2. Repo **Settings → Pages → Deploy from branch**, pick the branch and `/root`.
3. Open the published URL on the phone, then **“Add to Home Screen.”** It
   installs like an app and works offline.

Any static host (Netlify, Vercel, Cloudflare Pages, an S3 bucket) works too.

---

## How it’s put together

```
index.html            App shell + service-worker registration
manifest.webmanifest  PWA metadata (installable, offline)
service-worker.js     Cache-first offline shell
icons/icon.svg        App icon
src/css/styles.css    Calm, non-overstimulating theme (light + dark, reduced-motion aware)
src/js/
  content.js          Research-backed catalogue: check-in questions, onboarding, techniques
  store.js            Local persistence + scoring, the 10% win test, adaptation math
  adapt.js            Session builder + the daily "what you need today" brain
  session.js          Runs the guided session, one screen at a time
  games.js            Breathing pacer + the gentle focus games
  app.js              Screens & routing (profiles, onboarding, check-in, result, settings)
RESEARCH.md           The evidence behind every technique, with sources
```

Accessibility & comfort are first-class: large tap targets, soft muted palette,
slow motion, live-region announcements, and a **reduce-motion** toggle (plus it
honours the OS `prefers-reduced-motion` setting). Breathing exercises fall back
to text-led guidance when motion is reduced.

---

## The evidence

Every calming technique is grounded in published research — cyclic sighing
(Stanford, 2023), the DBT **TIPP** skills for intense emotion, sensory
grounding, progressive muscle relaxation, affect labelling / “name it to tame
it” (UCLA), and self-compassion. See **[RESEARCH.md](./RESEARCH.md)** for the
specifics and links.
