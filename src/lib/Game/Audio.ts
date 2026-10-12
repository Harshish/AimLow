import type { Phase } from './Session';
import type { Settings } from './config';

// C major pentatonic from C5: any run of these notes sounds pleasant, so ladders always resolve.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];
// The stream is a soft, warm rush like a fountain: low-passed noise, no resonant tinkle.
// Cutoff (Hz) and gain shift with where it lands. In the bowl the water steps back for the music.
const VOICES = {
	bowl: { cutoff: 1200, gain: 0.006 },
	bug: { cutoff: 1300, gain: 0.011 },
	spill: { cutoff: 700, gain: 0.01 },
	air: { cutoff: 1000, gain: 0.004 },
	off: { cutoff: 1000, gain: 0 }
};
type Voice = keyof typeof VOICES;
// In the bowl the water also rings a C chord, like a glass rim, with a soft melody on top.
// Both swell as the clean streak charges, and stay full during a drink.
const CHORD = [261.63, 392, 523.25, 659.25, 783.99];
const CHORD_GAIN = { hint: 0.06, full: 0.22 };
// Melody: a note every `gap` seconds (shrinking toward `rush` at full charge), wandering SCALE.
const MELODY = { gap: 0.32, rush: 0.18, length: 0.7, volume: [0.006, 0.012] };

/** Small synthesized arcade cues: no downloaded audio, autoplay, or per-droplet sounds. */
export default class Audio {
	private context?: AudioContext;
	private noise?: AudioBuffer;
	private stream?: GainNode;
	private streamFilter?: BiquadFilterNode;
	private voice: Voice = 'off';
	private chord?: GainNode;
	private chordLevel = 0;
	private nextNote = 0;
	private note = 2;
	private nextBeat = 0;
	private beat = 0;
	settings: Settings;
	constructor(settings: Settings) {
		this.settings = settings;
	}
	/** Creating a context blocks ~100 ms; do it while loading so the play click only resumes it. */
	prepare() {
		try {
			this.context ??= new AudioContext();
		} catch {
			/* Audio is optional. */
		}
	}
	unlock() {
		this.prepare();
		void this.context?.resume().catch(() => {});
	}
	private get running() {
		return this.context?.state === 'running' ? this.context : undefined;
	}
	private tone(
		frequency: number,
		length: number,
		volume = 0.045,
		offset = 0,
		type: OscillatorType = 'triangle'
	) {
		const context = this.running;
		if (!context) return;
		const now = context.currentTime + offset;
		const oscillator = context.createOscillator(),
			gain = context.createGain();
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(frequency, now);
		gain.gain.setValueAtTime(volume, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + length);
		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start(now);
		oscillator.stop(now + length);
		oscillator.onended = () => {
			oscillator.disconnect();
			gain.disconnect();
		};
	}
	/** One shared second of white noise feeds every splat and the stream. */
	private noiseSource(context: AudioContext) {
		if (!this.noise) {
			this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
			const data = this.noise.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		}
		const source = context.createBufferSource();
		source.buffer = this.noise;
		return source;
	}
	cue(kind: 'good' | 'bad' | 'drink' | 'quick' | 'start' | 'end') {
		if (!this.settings.sound) return;
		const notes =
			kind === 'bad' || kind === 'end'
				? [220, 110]
				: kind === 'drink'
					? [440, 660, 880]
					: kind === 'quick'
						? [784, 1175, 1568]
						: [523, 784];
		notes.forEach((note, i) => this.tone(note, 0.12, 0.06, i * 0.085));
	}
	/** One soft note per step of clean-streak charge; the drink cue lands on top. */
	chime(step: number) {
		if (this.settings.sound) this.tone(SCALE[Math.min(step * 2, SCALE.length - 1)], 0.4, 0.03);
	}
	/** Wet splat for a kill: a falling band of noise, a low thump, and a pling that climbs with combo. */
	splat(combo = 0) {
		const context = this.running;
		if (!context || !this.settings.sound) return;
		const now = context.currentTime;
		const source = this.noiseSource(context),
			filter = context.createBiquadFilter(),
			gain = context.createGain();
		filter.type = 'bandpass';
		filter.Q.value = 1.4;
		filter.frequency.setValueAtTime(1800, now);
		filter.frequency.exponentialRampToValueAtTime(320, now + 0.18);
		gain.gain.setValueAtTime(0.16, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
		source.connect(filter).connect(gain).connect(context.destination);
		source.start(now, Math.random() * 0.7, 0.25);
		source.onended = () => {
			source.disconnect();
			filter.disconnect();
			gain.disconnect();
		};
		this.tone(90, 0.14, 0.08);
		this.tone(SCALE[Math.min(combo, SCALE.length - 1)], 0.3, 0.035, 0.03);
	}
	/** `charge` is 0..1 progress toward the next power-up (1 while a drink is active). */
	update(
		phase: Phase,
		flowing: boolean,
		landing: 'bowl' | 'spill' | 'bug' | null = null,
		charge = 0
	) {
		const context = this.running;
		if (context) {
			if (!this.stream) {
				const source = this.noiseSource(context),
					filter = (this.streamFilter = context.createBiquadFilter()),
					swirl = context.createOscillator(),
					depth = context.createGain();
				this.stream = context.createGain();
				this.stream.gain.value = 0;
				filter.type = 'lowpass';
				filter.frequency.value = VOICES.air.cutoff;
				filter.Q.value = 0.3;
				// A slow wobble on the cutoff keeps the rush moving like running water, not static.
				swirl.frequency.value = 0.35;
				depth.gain.value = 180;
				swirl.connect(depth).connect(filter.frequency);
				swirl.start();
				source.loop = true;
				source.connect(filter).connect(this.stream).connect(context.destination);
				// Narrow band-passes turn the noise into pitched, airy tones; the swirl adds shimmer.
				this.chord = context.createGain();
				this.chord.gain.value = 0;
				this.chord.connect(context.destination);
				for (const frequency of CHORD) {
					const ring = context.createBiquadFilter(),
						shimmer = context.createGain();
					ring.type = 'bandpass';
					ring.frequency.value = frequency;
					ring.Q.value = 90;
					shimmer.gain.value = frequency * 0.006;
					swirl.connect(shimmer).connect(ring.frequency);
					source.connect(ring).connect(this.chord);
				}
				source.start();
			}
			const voice: Voice =
				this.settings.sound && flowing && phase === 'playing' ? (landing ?? 'air') : 'off';
			// Schedule on change only; a per-frame automation event just grows the param timeline.
			if (voice !== this.voice) {
				this.voice = voice;
				const now = context.currentTime;
				this.stream.gain.setTargetAtTime(VOICES[voice].gain, now, 0.08);
				this.streamFilter!.frequency.setTargetAtTime(VOICES[voice].cutoff, now, 0.08);
			}
			// Tenths of charge, so the swell schedules a handful of events, not one per frame.
			const step = Math.round(Math.min(1, Math.max(0, charge)) * 10) / 10;
			const level =
				voice === 'bowl' ? CHORD_GAIN.hint + (CHORD_GAIN.full - CHORD_GAIN.hint) * step : 0;
			if (level !== this.chordLevel) {
				// Slow bloom in, quicker fade out: the swell feels earned, a miss cuts it short.
				const now = context.currentTime;
				this.chord!.gain.setTargetAtTime(level, now, level > this.chordLevel ? 0.25 : 0.1);
				this.chordLevel = level;
			}
			if (voice === 'bowl' && context.currentTime >= this.nextNote) {
				// Step a note or two up or down so it sings a line, never random beeps.
				const move = Math.floor(Math.random() * 5) - 2;
				this.note = Math.max(0, Math.min(SCALE.length - 1, this.note + (move || 1)));
				const [quiet, loud] = MELODY.volume;
				this.tone(SCALE[this.note], MELODY.length, quiet + (loud - quiet) * step, 0, 'sine');
				this.nextNote = context.currentTime + MELODY.gap - (MELODY.gap - MELODY.rush) * step;
			}
		}
		if (!context || !this.settings.music || phase !== 'playing') {
			this.nextBeat = 0;
			return;
		}
		if (context.currentTime >= this.nextBeat) {
			this.tone([130.81, 164.81, 196, 164.81][this.beat++ % 4], 0.15, 0.025);
			this.nextBeat = context.currentTime + 0.3;
		}
	}
	dispose() {
		void this.context?.close().catch(() => {});
	}
}
