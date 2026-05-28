let ctx: AudioContext | null = null;

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

export function unlockAudio() {
  const context = getCtx();
  if (context && context.state === 'suspended') {
    context.resume().catch((err) => {
      console.warn('Failed to resume AudioContext:', err);
    });
  }
}

export function playClick() {
  const context = getCtx();
  if (!context) return;

  // Make sure it is resumed (handle browser autoplay restriction)
  if (context.state === 'suspended') {
    context.resume().catch(() => {});
  }

  try {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, context.currentTime); // 1kHz beep
    osc.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.04);

    gain.gain.setValueAtTime(0.04, context.currentTime); // Low volume
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.04); // Fast fade

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(context.currentTime);
    osc.stop(context.currentTime + 0.04);
  } catch (err) {
    console.warn('Failed to play click sound:', err);
  }
}
