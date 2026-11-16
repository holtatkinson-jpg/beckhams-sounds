// Siren sound engine. Every sound is built from a "recipe" (see data.js):
//   { layers: [ {type:'sweep'|'tones'|'horn'|'mech'|'bell', ...} ] }   -> synthesized
//   { file: 'audio/usa-fire-wail.m4a', loop: [start, end] }            -> a real recording, looping between two times (seconds)
//   { file: 'audio/drive-past.m4a', once: true }                       -> a real recording that plays through one time, then stops
window.Sirens = (() => {
  const MAX_SECONDS = 20; // sounds stop by themselves after this long

  // ---------- layer builders (work on any AudioContext, live or offline) ----------
  function shape(ctx, src, out, L, dflt) {
    // gives the raw oscillator the "horn speaker" sound and sets loudness
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = L.lp || dflt.lp; lp.Q.value = 0.7;
    const pk = ctx.createBiquadFilter();
    pk.type = 'peaking'; pk.frequency.value = L.peak || dflt.peak; pk.Q.value = 1; pk.gain.value = 6;
    const g = ctx.createGain(); g.gain.value = L.gain || dflt.gain;
    src.connect(lp); lp.connect(pk); pk.connect(g); g.connect(out);
    return g;
  }

  const LAYERS = {
    // pitch slides up and down: wail, yelp, phaser, rumble
    sweep({ ctx, out, osc, t0, dur, L }) {
      const o = osc(L.wave || 'square', L.lo);
      const f = o.frequency;
      f.setValueAtTime(L.lo, t0);
      for (let t = t0; t < t0 + dur; t += L.up + L.down) {
        f.exponentialRampToValueAtTime(L.hi, t + L.up);
        f.exponentialRampToValueAtTime(L.lo, t + L.up + L.down);
      }
      shape(ctx, o, out, L, { lp: 3800, peak: 1500, gain: 0.3 });
    },

    // fixed notes one after another: hi-lo, two-tone, pin-pon. A note of 0 Hz is a silence.
    tones({ ctx, out, osc, t0, dur, L }) {
      const first = L.seq.find(s => s[0] > 0)[0];
      const o = osc(L.wave || 'square', first);
      const gate = ctx.createGain(); gate.gain.value = 0;
      o.connect(gate);
      let t = t0, i = 0;
      while (t < t0 + dur) {
        const [freq, len] = L.seq[i % L.seq.length];
        if (freq > 0) {
          o.frequency.setValueAtTime(freq, t);
          gate.gain.setTargetAtTime(1, t, 0.006);
        } else {
          gate.gain.setTargetAtTime(0, t, 0.006);
        }
        t += len; i++;
      }
      shape(ctx, gate, out, L, { lp: 3400, peak: 1200, gain: 0.3 });
    },

    // air horn: a chord of buzzy notes, in blasts
    horn({ ctx, out, osc, t0, dur, L }) {
      const mix = ctx.createGain(); mix.gain.value = 0;
      for (const freq of L.freqs) {
        for (const cents of [-7, 7]) {
          const o = osc('sawtooth', freq);
          o.detune.value = cents;
          o.connect(mix);
        }
      }
      let t = t0, i = 0;
      while (t < t0 + dur) {
        const [on, off] = L.pattern[i % L.pattern.length];
        mix.gain.setTargetAtTime(1, t, 0.02);
        mix.gain.setTargetAtTime(0, t + on, 0.035);
        t += on + off; i++;
      }
      shape(ctx, mix, out, L, { lp: 2400, peak: 700, gain: 0.11 });
    },

    // mechanical siren: winds up, holds, then coasts down, with a growl underneath
    mech({ ctx, out, osc, t0, dur, L }) {
      const top = osc('sawtooth', 90);
      const sub = osc('square', 90);
      sub.detune.value = -1200;
      const level = ctx.createGain(); level.gain.value = 0.2;
      const subMix = ctx.createGain(); subMix.gain.value = 0.5;
      top.connect(level); sub.connect(subMix); subMix.connect(level);
      for (const p of [top.frequency, sub.frequency]) p.setValueAtTime(90, t0);
      level.gain.setValueAtTime(0.2, t0);
      let t = t0;
      while (t < t0 + dur) {
        for (const p of [top.frequency, sub.frequency]) {
          p.exponentialRampToValueAtTime(L.hi, t + L.up);
          p.setValueAtTime(L.hi, t + L.up + L.hold);
          p.exponentialRampToValueAtTime(L.mid, t + L.up + L.hold + L.down);
        }
        level.gain.linearRampToValueAtTime(1, t + L.up);
        level.gain.setValueAtTime(1, t + L.up + L.hold);
        level.gain.linearRampToValueAtTime(0.55, t + L.up + L.hold + L.down);
        t += L.up + L.hold + L.down;
      }
      shape(ctx, level, out, L, { lp: 3000, peak: 900, gain: 0.26 });
    },

    // struck bell: ringing notes that fade after each hit
    bell({ ctx, out, osc, t0, dur, L }) {
      const partials = [[1, 1], [2.76, 0.5], [5.4, 0.25]];
      const mix = ctx.createGain(); mix.gain.value = L.gain || 0.22;
      mix.connect(out);
      for (const [ratio, amp] of partials) {
        const o = osc('sine', L.freq * ratio);
        const g = ctx.createGain(); g.gain.value = 0;
        o.connect(g); g.connect(mix);
        let t = t0 + (L.delay || 0), i = 0;
        while (t < t0 + dur) {
          g.gain.setValueAtTime(amp, t);
          g.gain.setTargetAtTime(0, t + 0.005, 0.11 / Math.sqrt(ratio));
          t += L.pattern[i % L.pattern.length]; i++;
        }
      }
    },
  };

  // Builds the whole sound graph. Returns the output node plus a pitch-bend control.
  function build(ctx, sound, t0, dur, buffer) {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(1, t0 + 0.03);
    const bend = ctx.createConstantSource(); // pitch bend in cents, used by drive-by
    bend.offset.value = 0;
    bend.start(t0);
    const nodes = [bend];
    const osc = (type, freq) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = freq;
      bend.connect(o.detune);
      o.start(t0);
      nodes.push(o);
      return o;
    };
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer; src.loop = !sound.once;
      const from = sound.loop ? sound.loop[0] : 0;
      src.loopStart = from;
      src.loopEnd = Math.min(sound.loop ? sound.loop[1] : buffer.duration, buffer.duration);
      if (src.detune) bend.connect(src.detune);
      src.connect(out); src.start(t0, from);
      nodes.push(src);
    } else {
      for (const L of sound.layers) LAYERS[L.type]({ ctx, out, osc, t0, dur, L });
    }
    return { out, bend, nodes };
  }

  // ---------- live playback ----------
  let ctx = null, dist = null, pan = null, current = null, stopTimer = 0;
  const buffers = {};

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      // keeps sound on even when the iPad is switched to silent
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      dist = ctx.createGain();
      const master = ctx.createGain(); master.gain.value = 0.8;
      const comp = ctx.createDynamicsCompressor();
      if (ctx.createStereoPanner) {
        pan = ctx.createStereoPanner();
        dist.connect(pan); pan.connect(master);
      } else {
        dist.connect(master);
      }
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume();
  }

  async function play(sound, onEnd) {
    unlock();
    stop();
    const token = {};
    current = { token, onEnd };
    let buffer = null;
    if (sound.file) {
      try {
        if (!buffers[sound.file]) {
          const data = await (await fetch(sound.file)).arrayBuffer();
          buffers[sound.file] = await ctx.decodeAudioData(data);
        }
        buffer = buffers[sound.file];
      } catch (e) {
        console.warn('Could not load recording, using the synth version instead:', sound.file, e);
      }
      if (!current || current.token !== token) return; // something else started meanwhile
      if (!buffer && !sound.layers) { stop(); return; }
    }
    const voice = build(ctx, sound, ctx.currentTime + 0.02, MAX_SECONDS, buffer);
    voice.out.connect(dist);
    Object.assign(current, voice);
    const life = buffer && sound.once ? Math.min(MAX_SECONDS, buffer.duration) : MAX_SECONDS;
    stopTimer = setTimeout(stop, life * 1000);
    if (current.pendingDrive) driveBy(current.pendingDrive);
  }

  function resetDriveBy() {
    const t = ctx.currentTime;
    try {
      dist.gain.cancelScheduledValues(t); dist.gain.setValueAtTime(1, t);
      if (pan) { pan.pan.cancelScheduledValues(t); pan.pan.setValueAtTime(0, t); }
    } catch (e) {}
  }

  function stop() {
    clearTimeout(stopTimer);
    if (!current) return;
    const v = current;
    current = null;
    if (v.out) {
      const t = ctx.currentTime;
      v.out.gain.cancelScheduledValues(t);
      v.out.gain.setValueAtTime(v.out.gain.value, t);
      v.out.gain.linearRampToValueAtTime(0, t + 0.06);
      setTimeout(() => {
        v.nodes.forEach(n => { try { n.stop(); } catch (e) {} });
        v.out.disconnect();
      }, 150);
      resetDriveBy();
    }
    if (v.onEnd) v.onEnd();
  }

  // Makes the playing sound whoosh past: pitch drops, volume swells and fades, left to right.
  function driveBy(seconds) {
    if (!current) return;
    if (!current.out) { current.pendingDrive = seconds; return; } // recording still loading
    const N = 96, speed = 26 / 343; // vehicle speed as a fraction of the speed of sound
    const cents = new Float32Array(N), vol = new Float32Array(N), side = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * 2 - 1;               // -1 = far left, +1 = far right
      const toward = -x / Math.sqrt(x * x + 0.02);    // +1 coming at you, -1 going away
      cents[i] = 1200 * Math.log2(1 / (1 - speed * toward));
      vol[i] = 1 / Math.sqrt(1 + 14 * x * x);
      side[i] = Math.max(-1, Math.min(1, x * 1.2));
    }
    const t = ctx.currentTime + 0.01;
    try {
      current.bend.offset.cancelScheduledValues(t);
      current.bend.offset.setValueCurveAtTime(cents, t, seconds);
      dist.gain.cancelScheduledValues(t);
      dist.gain.setValueCurveAtTime(vol, t, seconds);
      if (pan) {
        pan.pan.cancelScheduledValues(t);
        pan.pan.setValueCurveAtTime(side, t, seconds);
      }
    } catch (e) { console.warn('drive-by effect unavailable', e); }
  }

  return { unlock, play, stop, driveBy, build, isPlaying: () => !!current, MAX_SECONDS };
})();
