// Lightweight, zero-dependency sound generation using Web Audio API
let audioCtx;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export function playSound(type) {
  try {
    if (localStorage.getItem('sz_sound_enabled') === 'false') return;
    
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'pop') {
      // Soft, quick wooden pop (Add to Cart)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      
    } else if (type === 'tap') {
      // Very short, high-pitched mechanical tap (Numpad input)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);

    } else if (type === 'switch') {
      // Subtle sliding click (Toggle switches, sidebar, user switch)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.05);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);

    } else if (type === 'click') {
      // Standard interface click
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.02);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);

    } else if (type === 'success') {
      // Pleasant upward chime (Checkout Complete)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      
      // Add a subtle harmony
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now); // E5
      gain2.gain.setValueAtTime(0.1, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.5);

    } else if (type === 'error') {
      // Low dual warning beep
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);

      const oscError = ctx.createOscillator();
      const gainError = ctx.createGain();
      oscError.type = 'square';
      oscError.frequency.setValueAtTime(150, now + 0.15);
      gainError.gain.setValueAtTime(0.2, now + 0.15);
      gainError.gain.linearRampToValueAtTime(0.01, now + 0.3);

      oscError.connect(gainError);
      gainError.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
      
      oscError.start(now + 0.15);
      oscError.stop(now + 0.3);
    }
  } catch (err) {
    console.warn("Sound playback prevented by browser policy", err);
  }
}
