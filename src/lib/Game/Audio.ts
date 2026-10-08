import type { Phase } from './Session';
import type { Settings } from './config';

/** Small synthesized arcade cues: no downloaded audio, autoplay, or per-droplet sounds. */
export default class Audio {
	private context?: AudioContext;
	private noise?: AudioBuffer;
	private hiss?: GainNode;
	private hissLevel = 0;
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
	private tone(frequency: number, length: number, volume = 0.045, offset = 0) {
		const context = this.running;
		if (!context) return;
		const now = context.currentTime + offset;
		const oscillator = context.createOscillator(),
			gain = context.createGain();
		oscillator.type = 'triangle';
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
	/** One shared second of white noise feeds every splash and the stream hiss. */
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
	/** Wet splat for a kill: a falling band of noise plus a low thump. */
	splat() {
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
	}
	update(phase: Phase, flowing: boolean) {
		const context = this.running;
		if (context) {
			if (!this.hiss) {
				// A soft, continuous hiss sells the stream without per-droplet sounds.
				const source = this.noiseSource(context),
					filter = context.createBiquadFilter();
				this.hiss = context.createGain();
				this.hiss.gain.value = 0;
				filter.type = 'bandpass';
				filter.frequency.value = 2600;
				filter.Q.value = 0.7;
				source.loop = true;
				source.connect(filter).connect(this.hiss).connect(context.destination);
				source.start();
			}
			const level = this.settings.sound && flowing && phase === 'playing' ? 0.022 : 0;
			// Schedule on change only; a per-frame automation event just grows the param timeline.
			if (level !== this.hissLevel) {
				this.hissLevel = level;
				this.hiss.gain.setTargetAtTime(level, context.currentTime, 0.08);
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
