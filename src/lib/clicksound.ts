let ctx: AudioContext | null = null;
let clickBuffer: AudioBuffer | null = null;
let loadPromise: Promise<void> | null = null;

const CLICK_URL = '/sound/poop.wav';
const CLICK_VOLUME = 0.9;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!ctx) {
    try {
      ctx = new AudioContextClass();
    } catch (e) {
      console.warn('Failed to create AudioContext:', e);
    }
  }
  return ctx;
}

function loadBuffer(context: AudioContext): Promise<void> {
  if (clickBuffer) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = fetch(CLICK_URL)
    .then((res) => res.arrayBuffer())
    .then((data) => context.decodeAudioData(data))
    .then((buf) => {
      clickBuffer = buf;
    })
    .catch((err) => {
      console.warn('Failed to load click sound:', err);
      loadPromise = null; // allow retry
    });

  return loadPromise;
}

export function unlockAudio() {
  const context = getCtx();
  if (!context) return;

  if (context.state === 'suspended') {
    context.resume().catch((err) => {
      console.warn('Failed to resume AudioContext:', err);
    });
  }

  // Preload on first gesture so the first tap has the buffer ready.
  void loadBuffer(context);
}

export function playClick() {
  const context = getCtx();
  if (!context) return;

  if (context.state === 'suspended') {
    context.resume().catch(() => {});
  }

  if (!clickBuffer) {
    void loadBuffer(context); // not decoded yet — this tap is silent, next plays
    return;
  }

  try {
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = clickBuffer;
    gain.gain.setValueAtTime(CLICK_VOLUME, context.currentTime);

    source.connect(gain);
    gain.connect(context.destination);

    source.start(context.currentTime);
  } catch (err) {
    console.warn('Failed to play click sound:', err);
  }
}
