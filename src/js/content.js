// content.js
// Research-backed content library: check-in questions, onboarding, and the
// technique catalogue. Everything here is data so the app can adapt what it
// shows without touching the flow logic. See RESEARCH.md for citations.

// ---------------------------------------------------------------------------
// Age bands. The 4-year-old lands in "child"; a typical adult in "adult".
// ---------------------------------------------------------------------------
export function ageBandFor(age) {
  const a = Number(age);
  if (!Number.isFinite(a)) return 'adult';
  if (a <= 9) return 'child';
  if (a <= 17) return 'teen';
  return 'adult';
}

// ---------------------------------------------------------------------------
// Daily check-in. Five questions, each 1..5, plus the headline 1..10 "how do
// you feel today, 10 = the best in the world" that drives the help trigger.
// Questions are worded softly and are NOT clinical/diagnostic.
// ---------------------------------------------------------------------------
export const CHECKIN = {
  adult: {
    overallPrompt: 'How do you feel today?',
    overallHint: '1 = really not okay · 10 = the best in the world',
    questions: [
      {
        id: 'calm',
        text: 'How settled does your body feel right now?',
        low: 'On edge',
        high: 'Settled',
      },
      {
        id: 'control',
        text: 'How in-control of your emotions do you feel?',
        low: 'Swept along',
        high: 'Steady',
      },
      {
        id: 'connected',
        text: 'How connected do you feel to the people around you?',
        low: 'Far away',
        high: 'Close',
      },
      {
        id: 'energy',
        text: 'How is your energy?',
        low: 'Empty',
        high: 'Full',
      },
      {
        id: 'selfkind',
        text: 'How kind are you able to be to yourself right now?',
        low: 'Harsh',
        high: 'Gentle',
      },
    ],
  },
  teen: {
    overallPrompt: 'How are you feeling today?',
    overallHint: '1 = really rough · 10 = amazing',
    questions: [
      { id: 'calm', text: 'How chill or on-edge do you feel?', low: 'On edge', high: 'Chill' },
      { id: 'control', text: 'How in-control of your feelings do you feel?', low: 'Out of control', high: 'In control' },
      { id: 'connected', text: 'How connected do you feel to people?', low: 'Alone', high: 'Connected' },
      { id: 'energy', text: 'How is your energy?', low: 'Drained', high: 'Charged' },
      { id: 'selfkind', text: 'How kind can you be to yourself right now?', low: 'Hard on me', high: 'Kind' },
    ],
  },
  // Children answer with pictures, guided by a grown-up. Young kids read a
  // "weather inside you" metaphor far more naturally than a number or a scale —
  // it's a staple of preschool emotion coaching. Faces are kept as a backup.
  child: {
    overallPrompt: 'What’s the weather inside you?',
    overallHint: 'Point to the sky that feels like you right now',
    faces: ['😖', '😢', '😐', '🙂', '😄'],
    weathers: [
      { e: '⛈️', label: 'Stormy', v: 2 },
      { e: '🌧️', label: 'Rainy', v: 4 },
      { e: '☁️', label: 'Cloudy', v: 6 },
      { e: '🌤️', label: 'Peeking sun', v: 8 },
      { e: '☀️', label: 'Sunny', v: 10 },
    ],
    questions: [
      { id: 'body', text: 'Is your body calm or wiggly?', low: 'Wiggly', high: 'Calm' },
      { id: 'happy', text: 'How happy is your heart?', low: 'Sad', high: 'Happy' },
      { id: 'safe', text: 'How safe and cozy do you feel?', low: 'Not cozy', high: 'Cozy' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Onboarding. An extensive but gentle interview that teaches the app how to
// help this specific person when they feel out of control. Answers steer which
// techniques get offered and how the session is worded.
// ---------------------------------------------------------------------------
export const ONBOARDING = {
  adult: [
    {
      id: 'signs',
      type: 'multi',
      title: 'When a hard moment is starting, what do you notice first?',
      subtitle: 'Pick any that fit. This helps the app step in earlier.',
      options: [
        'My thoughts race',
        'My chest gets tight',
        'I go blank / foggy',
        'I get snappy or irritable',
        'I feel like crying',
        'I want to be alone',
        'I make quick decisions I later regret',
        'My body feels restless',
      ],
    },
    {
      id: 'helps',
      type: 'multi',
      title: 'In the past, what has actually helped you feel more like yourself?',
      subtitle: 'Even a little. Pick any.',
      options: [
        'Getting outside / fresh air',
        'Sunlight or daylight',
        'Moving my body or a walk',
        'A puzzle or game to focus on',
        'Slow breathing',
        'Cold water',
        'Quiet and dim light',
        'Taking care of my body (water, food, routine)',
        'Being reminded I am safe',
        'Music or soft sound',
        'Writing or naming what I feel',
      ],
    },
    {
      id: 'style',
      type: 'single',
      title: 'When a hard moment hits, what tends to help more?',
      subtitle: 'There’s no right answer — this just changes what I reach for first.',
      options: [
        { value: 'outward', label: 'Getting out of my head — move, go outside, or focus on something' },
        { value: 'inward', label: 'Settling inward — breathing, stillness, quiet' },
        { value: 'mixed', label: 'A bit of both, depending on the day' },
      ],
    },
    {
      id: 'space',
      type: 'single',
      title: 'In a hard moment, what do you tend to need?',
      options: [
        { value: 'space', label: 'Space and quiet — let me settle myself' },
        { value: 'gentle', label: 'Gentle company — a calm presence nearby' },
        { value: 'guided', label: 'Clear, simple steps to follow' },
      ],
    },
    {
      id: 'sensory',
      type: 'single',
      title: 'What feels most soothing to your senses?',
      options: [
        { value: 'visual', label: 'Watching something slow and gentle' },
        { value: 'touch', label: 'Warmth, pressure, or something to hold' },
        { value: 'sound', label: 'Soft, steady sound' },
        { value: 'still', label: 'Stillness and less input' },
      ],
    },
    {
      id: 'pace',
      type: 'single',
      title: 'When you are overwhelmed, how much do you want on the screen?',
      options: [
        { value: 'minimal', label: 'As little as possible — one thing at a time' },
        { value: 'some', label: 'A bit of guidance is okay' },
      ],
    },
    {
      id: 'anchor',
      type: 'text',
      title: 'Name one person, place, or memory that feels safe.',
      subtitle: 'The app may gently remind you of it. You can leave this blank.',
      placeholder: 'e.g. the porch at sunset, my daughter’s laugh',
      optional: true,
    },
    {
      id: 'words',
      type: 'text',
      title: 'What is one true, kind thing you would want to hear on a hard day?',
      subtitle: 'The app will offer it back to you. You can leave this blank.',
      placeholder: 'e.g. This will pass. You are not your worst moment.',
      optional: true,
    },
    {
      id: 'motion',
      type: 'single',
      title: 'Do animations feel calming or too much?',
      options: [
        { value: 'full', label: 'Calming — gentle motion helps me' },
        { value: 'reduced', label: 'Too much — keep it still' },
      ],
    },
  ],
  teen: [
    {
      id: 'signs', type: 'multi',
      title: 'When a hard moment starts, what shows up first?',
      subtitle: 'Pick any.',
      options: ['Racing thoughts', 'Tight chest', 'Going blank', 'Getting snappy', 'Wanting to cry', 'Wanting to be alone', 'Restless body'],
    },
    {
      id: 'helps', type: 'multi',
      title: 'What has helped you calm down before?',
      subtitle: 'Pick any.',
      options: ['Slow breathing', 'Cold water / fresh air', 'Quiet + dim light', 'Moving around', 'Focusing my hands or eyes', 'Music', 'Naming what I feel'],
    },
    {
      id: 'space', type: 'single',
      title: 'In a hard moment you mostly want…',
      options: [
        { value: 'space', label: 'Space to settle myself' },
        { value: 'gentle', label: 'Someone calm nearby' },
        { value: 'guided', label: 'Simple steps to follow' },
      ],
    },
    {
      id: 'motion', type: 'single',
      title: 'Gentle animations — calming or too much?',
      options: [
        { value: 'full', label: 'Calming' },
        { value: 'reduced', label: 'Keep it still' },
      ],
    },
  ],
  // The grown-up fills this in for a young child.
  child: [
    {
      id: 'theme',
      type: 'single',
      title: 'What does she love most right now?',
      subtitle: 'We’ll theme the games and her buddy around it.',
      options: [
        { value: 'pups', label: '🐶 Rescue pups' },
        { value: 'animals', label: '🐾 Animals' },
        { value: 'ocean', label: '🐠 Ocean friends' },
        { value: 'space', label: '🚀 Space' },
        { value: 'dino', label: '🦖 Dinosaurs' },
        { value: 'unicorn', label: '🦄 Unicorns & magic' },
      ],
    },
    {
      id: 'heroes',
      type: 'text',
      title: 'Favorite characters?',
      subtitle: 'Type their names (like her favorite pups) and we’ll use them as her helpers. You can leave this blank.',
      placeholder: 'e.g. Chase, Skye, Marshall',
      optional: true,
    },
    {
      id: 'favoriteAnimal', type: 'text',
      title: 'What is their favorite animal?',
      subtitle: 'We’ll make it their breathing buddy.',
      placeholder: 'e.g. bunny, dinosaur, kitty',
    },
    {
      id: 'favoriteColor', type: 'single',
      title: 'Favorite color?',
      options: [
        { value: 'blue', label: 'Blue' }, { value: 'green', label: 'Green' },
        { value: 'purple', label: 'Purple' }, { value: 'pink', label: 'Pink' },
        { value: 'yellow', label: 'Yellow' }, { value: 'orange', label: 'Orange' },
      ],
    },
    {
      id: 'comfort', type: 'multi',
      title: 'What helps them feel cozy again?',
      subtitle: 'Pick any.',
      options: ['A big hug', 'A stuffed animal', 'Quiet time', 'Rocking or swaying', 'A favorite song', 'Counting things', 'Blowing bubbles'],
    },
    {
      id: 'dislikes', type: 'multi',
      title: 'Anything to avoid when they’re upset?',
      subtitle: 'Optional. Pick any.',
      optional: true,
      options: ['Loud sounds', 'Bright flashing', 'Too many choices', 'Being rushed'],
    },
    {
      id: 'buddyName', type: 'text',
      title: 'What should we call their calm buddy?',
      subtitle: 'A friendly name for the helper.',
      placeholder: 'e.g. Sunny, Bibi, Rex',
      optional: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Technique catalogue. Each entry is a self-contained, research-grounded step
// the session can schedule. `kind` maps to a renderer in session.js/games.js.
//   bands       — who it suits
//   severityFit — 'high' techniques downregulate fastest (use when scores are
//                 very low / "going blank"); 'low' are gentler.
//   matches(ob) — optional boost when onboarding answers point to it.
// ---------------------------------------------------------------------------
export const TECHNIQUES = [
  {
    id: 'physiological-sigh',
    title: 'Cyclic sighing',
    lead: 'The fastest way to steady a racing body — two inhales, one long exhale.',
    kind: 'breath',
    bands: ['adult', 'teen'],
    severityFit: 'high',
    durationSec: 150,
    breath: { pattern: 'sigh', cycles: 12 },
    why: 'A Stanford study found five minutes of cyclic sighing lifted mood and slowed breathing more than meditation. The long exhale switches on the body’s calming (parasympathetic) brake.',
    matches: (ob) => (ob.helps || []).includes('Slow breathing'),
  },
  {
    id: 'box-breathing',
    title: 'Box breathing',
    lead: 'A steady square: in, hold, out, hold. Used to stay calm under pressure.',
    kind: 'breath',
    bands: ['adult', 'teen'],
    severityFit: 'low',
    durationSec: 120,
    breath: { pattern: 'box', cycles: 6 },
    why: 'Equal, paced breathing keeps the nervous system from tipping into fight-or-flight. It’s the "P" (paced breathing) in the DBT TIPP skill.',
    matches: (ob) => (ob.helps || []).includes('Slow breathing'),
  },
  {
    id: 'cold-reset',
    title: 'Cool the wave',
    lead: 'Cold water on your face or hands — a body reset for the biggest moments.',
    kind: 'guide',
    bands: ['adult', 'teen'],
    severityFit: 'high',
    durationSec: 90,
    steps: [
      'If you can, go to a sink or hold something cold.',
      'Cup cold water and hold it to your face — especially around your eyes and cheeks — or press a cold cloth there.',
      'Breathe slowly while it’s cool. Notice the sharpness.',
      'This triggers your body’s dive reflex, which slows your heart within seconds.',
    ],
    why: 'Cold on the face activates the mammalian dive reflex, quickly slowing heart rate and pulling the body out of overdrive. It’s the "T" (temperature) in DBT’s TIPP skill — fast, physical, and it works even when words don’t.',
    matches: (ob) => (ob.helps || []).includes('Cold water or fresh air'),
  },
  {
    id: 'grounding-54321',
    title: '5-4-3-2-1 grounding',
    lead: 'Come back to the room through your senses, one at a time.',
    kind: 'grounding',
    bands: ['adult', 'teen'],
    severityFit: 'high',
    durationSec: 150,
    why: 'When the mind goes blank or floods, orienting to real, present sensory detail interrupts the spiral and re-engages the thinking brain. A core trauma-informed grounding tool.',
    matches: (ob) => (ob.helps || []).includes('Something to focus my hands or eyes on') || (ob.signs || []).includes('I go blank / foggy'),
  },
  {
    id: 'pmr',
    title: 'Tense and release',
    lead: 'Gently squeeze, then let go — melt the tension your body is holding.',
    kind: 'body',
    bands: ['adult', 'teen'],
    severityFit: 'low',
    durationSec: 180,
    steps: [
      'Squeeze your hands into fists for a slow count of five… then release, and notice the softness.',
      'Lift your shoulders to your ears, hold five… release.',
      'Scrunch your face, hold five… release.',
      'Tighten your belly, hold five… release.',
      'Press your feet into the floor, hold five… release.',
      'Let your whole body go heavy and soft.',
    ],
    why: 'Progressive muscle relaxation teaches the body the difference between tension and calm, and physically lowers arousal — the "P" (paired muscle relaxation) in TIPP.',
    matches: (ob) => (ob.helps || []).includes('Gentle movement or a walk'),
  },
  {
    id: 'affect-labeling',
    title: 'Name it to tame it',
    lead: 'Put the feeling into words. Naming it turns the volume down.',
    kind: 'label',
    bands: ['adult', 'teen'],
    severityFit: 'low',
    durationSec: 120,
    why: 'UCLA brain imaging showed that simply naming an emotion quiets the amygdala — the brain’s alarm — and engages the calm, thinking part of the brain. You don’t have to fix the feeling. Naming it is enough to soften it.',
    matches: (ob) => (ob.helps || []).includes('Writing or naming what I feel'),
  },
  {
    id: 'self-compassion',
    title: 'A kinder voice',
    lead: 'Meet this moment the way you’d meet a friend who was hurting.',
    kind: 'compassion',
    bands: ['adult', 'teen'],
    severityFit: 'low',
    durationSec: 120,
    why: 'A self-compassion break — acknowledging the hurt, remembering you’re not alone in it, and offering yourself kindness — reliably lowers distress and self-criticism (Kristin Neff’s research).',
    matches: (ob) => (ob.signs || []).includes('I feel like crying') || (ob.helps || []).includes('Being reminded I am safe'),
  },
  {
    id: 'safe-anchor',
    title: 'Your safe place',
    lead: 'Return, in your mind, to the place that feels safe.',
    kind: 'anchor',
    bands: ['adult', 'teen'],
    severityFit: 'low',
    durationSec: 120,
    why: 'Recalling a vivid safe memory cues the body toward safety (polyvagal theory) and gives the mind somewhere steady to rest.',
    matches: (ob) => Boolean(ob.anchor),
  },

  // ---- Focus games (non-overstimulating) -------------------------------
  {
    id: 'game-breath-orb',
    title: 'Follow the light',
    lead: 'Let your breath ride a slow, glowing circle.',
    kind: 'game',
    game: 'breathOrb',
    bands: ['adult', 'teen', 'child'],
    severityFit: 'high',
    durationSec: 120,
    why: 'A visual breathing pacer occupies the eyes and gives the mind one gentle thing to hold, guiding the breath slower without effort.',
  },
  {
    id: 'game-ripples',
    title: 'Still water',
    lead: 'Touch the water and watch the ripples fade.',
    kind: 'game',
    game: 'ripples',
    bands: ['adult', 'teen', 'child'],
    severityFit: 'low',
    durationSec: 120,
    why: 'A slow, forgiving, no-score interaction pulls attention out of the head and onto something calm and repetitive.',
  },
  {
    id: 'game-match',
    title: 'Gentle pairs',
    lead: 'Find the matching pairs. No timer, no pressure.',
    kind: 'game',
    game: 'match',
    bands: ['adult', 'teen', 'child'],
    severityFit: 'low',
    durationSec: 150,
    why: 'A light working-memory task absorbs just enough attention to break rumination, without the pressure that would add stress.',
  },
  {
    id: 'word-search',
    title: 'Word search',
    lead: 'Give your busy mind a real job — hunt down the hidden words.',
    kind: 'game',
    game: 'wordSearch',
    bands: ['adult', 'teen'],
    severityFit: 'high',
    durationSec: 210,
    why: 'An absorbing visual-search puzzle occupies the thinking brain enough to interrupt a racing, ruminating spiral — a form of distraction, one of the most reliable ways to break an emotional loop. No timer, no way to fail.',
    matches: (ob) => (ob.helps || []).includes('A puzzle or game to focus on') || ob.style === 'outward',
  },

  // ---- Outward / body-based tools (get out of your head) ----------------
  {
    id: 'sunlight',
    title: 'Toward the light',
    lead: 'Get to the brightest spot you can — a window, a doorway, outside.',
    kind: 'outside',
    bands: ['adult', 'teen'],
    severityFit: 'high',
    durationSec: 90,
    steps: [
      'Stand up. Go to the brightest place near you — a big window, an open door, or step outside.',
      'Turn your face toward the light. Let your eyes rest on something far away.',
      'Feel the light and air on your skin. Take it in for a few slow breaths.',
      'There is nothing to do here but be in the light for a moment.',
    ],
    why: 'Bright light and daylight are among the best-supported non-drug ways to lift low mood; several clinical trials found morning bright-light exposure eased low, heavy moods. Getting your eyes and body into light also gently pulls attention outward.',
    matches: (ob) => (ob.helps || []).includes('Sunlight or daylight') || (ob.helps || []).includes('Getting outside / fresh air') || ob.style === 'outward',
  },
  {
    id: 'walk-it-out',
    title: 'Walk it out',
    lead: 'Get up and move. One foot, then the other — take it outside if you can.',
    kind: 'game',
    game: 'walkPacer',
    bands: ['adult', 'teen'],
    severityFit: 'high',
    durationSec: 180,
    why: 'Moving your body — especially a walk outdoors — is one of the most effective non-drug ways to shift a heavy or agitated mood. Movement burns off the surge of stress chemistry and gives a restless, "I need to act now" feeling somewhere safe to go.',
    matches: (ob) => (ob.helps || []).includes('Moving my body or a walk') || (ob.helps || []).includes('Getting outside / fresh air') || ob.style === 'outward',
  },
  {
    id: 'nourish',
    title: 'A little care',
    lead: 'A small, kind thing for your body — no pressure, just what you can.',
    kind: 'nourish',
    bands: ['adult', 'teen'],
    severityFit: 'low',
    why: 'When mood dips, basic care slips — and low blood sugar, dehydration, and a skipped routine all make the low feel worse. A few small, steadying acts of body-care can take the edge off. This is a gentle nudge, never a rule.',
    matches: (ob) => (ob.helps || []).includes('Taking care of my body (water, food, routine)'),
  },

  // ---- Child techniques -------------------------------------------------
  {
    id: 'child-buddy-breath',
    title: 'Buddy belly breaths',
    lead: 'Lie down and let your buddy ride your tummy up and down.',
    kind: 'child-breath',
    bands: ['child'],
    severityFit: 'high',
    durationSec: 90,
    breath: { pattern: 'belly', cycles: 6 },
    why: 'Placing a stuffed animal on the belly makes slow diaphragmatic breathing visible and playful for young children — a well-loved pediatric calming tool.',
  },
  {
    id: 'child-flower-candle',
    title: 'Smell the flower, blow the candle',
    lead: 'Breathe in the flower… blow out the candle.',
    kind: 'child-breath',
    bands: ['child'],
    severityFit: 'high',
    durationSec: 90,
    breath: { pattern: 'flowercandle', cycles: 6 },
    why: 'A concrete image ("smell the flower, blow out the candle") is the simplest way to teach a young child a long, calming exhale.',
  },
  {
    id: 'child-star',
    title: 'Star breathing',
    lead: 'Trace the star with your finger and breathe along each side.',
    kind: 'game',
    game: 'starBreath',
    bands: ['child'],
    severityFit: 'low',
    durationSec: 90,
    why: 'Tracing a shape while breathing pairs a calming exhale with a simple motor task a preschooler can follow.',
  },
  {
    id: 'child-feelings',
    title: 'Show your feeling',
    lead: 'Show me your feeling — the weather inside, and how big it is.',
    kind: 'child-feelings',
    bands: ['child'],
    severityFit: 'low',
    durationSec: 60,
    why: 'Even at four, naming a feeling with a picture helps a child’s brain settle — an early, playful version of "name it to tame it."',
  },
  {
    id: 'child-bubbles',
    title: 'Bubble breaths',
    lead: 'Take a big slow breath and blow the biggest, slowest bubble.',
    kind: 'game',
    game: 'ripples',
    bands: ['child'],
    severityFit: 'low',
    durationSec: 90,
    why: 'Pretending to blow slow bubbles naturally lengthens the exhale — calming, and fun.',
  },
  {
    id: 'child-cloud',
    title: 'Blow the cloud away',
    lead: 'A big grey cloud is hiding the sun. Blow it away, puff by puff!',
    kind: 'game',
    game: 'blowCloud',
    bands: ['child'],
    severityFit: 'high',
    durationSec: 90,
    why: 'A playful "blow the cloud away" game turns a long, calming exhale into something a young child wants to do — and the reveal keeps them engaged just long enough for a rising storm to settle before it peaks.',
  },
  {
    id: 'child-parade',
    title: 'Wiggle parade',
    lead: 'Your buddy calls out silly moves — stomp, flap, and wiggle them out!',
    kind: 'game',
    game: 'wiggleParade',
    bands: ['child'],
    severityFit: 'high',
    durationSec: 90,
    why: 'Big feelings live in a little body. A short burst of silly, guided movement (stomp like an elephant, flap like a bird) discharges the surge and redirects attention through play — catching a meltdown before it fully lands. A calm grown-up joining in is the real magic (co-regulation).',
  },
  {
    id: 'child-pop',
    title: 'Pop the pop-ups',
    lead: 'Tap the friends as they peek out — pop, pop, pop!',
    kind: 'game',
    game: 'popPups',
    bands: ['child'],
    severityFit: 'high',
    durationSec: 90,
    why: 'A simple, winnable tap game is powerful distraction for a young child: it captures attention completely, gives instant playful feedback, and asks nothing hard — redirecting a rising storm onto something fun.',
  },
  {
    id: 'child-colortap',
    title: 'Color helpers',
    lead: 'Your buddy calls a color — can you find and tap it?',
    kind: 'game',
    game: 'colorTap',
    bands: ['child'],
    severityFit: 'low',
    durationSec: 90,
    why: 'A little “find the color” challenge gives a child’s mind one clear, doable job — enough focus to interrupt distress, with a happy cheer each time that keeps them engaged.',
  },
  {
    id: 'child-scribble',
    title: 'Draw your feeling',
    lead: 'Use your finger to scribble how you feel — any colors you like.',
    kind: 'game',
    game: 'scribble',
    bands: ['child'],
    severityFit: 'low',
    durationSec: 120,
    why: 'Young children often can’t put big feelings into words, but they can put them onto a page. Scribbling gives the feeling somewhere to go and is calming and expressive at once — a different, developmentally natural way to “say” how they feel.',
  },
];

export function techniqueById(id) {
  return TECHNIQUES.find((t) => t.id === id) || null;
}

// ---------------------------------------------------------------------------
// Child theming. Skins the games and the buddy around what the child loves.
// We intentionally use friendly generic characters (emoji) rather than any
// branded/trademarked artwork, and let the grown-up type the actual character
// names the child adores so they show up as the on-screen helpers.
// ---------------------------------------------------------------------------
const THEMES = {
  pups:    { emojis: ['🐶', '🐕', '🦮', '🐩', '🐕‍🦺', '🐾'], buddy: '🐶', word: 'pup',   crew: 'rescue pups' },
  animals: { emojis: ['🐰', '🦊', '🐻', '🐼', '🐨', '🦁'], buddy: '🐻', word: 'friend', crew: 'animal friends' },
  ocean:   { emojis: ['🐠', '🐙', '🐢', '🐳', '🦀', '🐚'], buddy: '🐠', word: 'friend', crew: 'ocean friends' },
  space:   { emojis: ['🚀', '⭐', '🪐', '🌙', '☄️', '👽'], buddy: '🚀', word: 'star',   crew: 'space crew' },
  dino:    { emojis: ['🦖', '🦕', '🦎', '🐊', '🥚', '🌋'], buddy: '🦖', word: 'dino',   crew: 'dino pals' },
  unicorn: { emojis: ['🦄', '🌈', '⭐', '🦋', '🌸', '✨'], buddy: '🦄', word: 'friend', crew: 'magic friends' },
};

export function childTheme(profile) {
  const ob = profile.onboarding || {};
  const t = THEMES[ob.theme] || THEMES.animals;
  const heroes = String(ob.heroes || '')
    .split(/[,/&]| and /i).map((s) => s.trim()).filter(Boolean).slice(0, 6);
  return { ...t, heroes };
}
