import type { Phase } from './Session';
import type { Settings } from './config';

/** Small synthesized arcade cues: no downloaded audio, autoplay, or per-droplet sounds. */
export default class Audio {
	private context?: AudioContext;
	private nextBeat = 0;
	private beat = 0;
	settings: Settings;
	constructor(settings: Settings) {
		this.settings = settings;
	}
	unlock() {
		try {
			this.context ??= new AudioContext();
			void this.context.resume().catch(() => {});
		} catch {
			/* Audio is optional. */
		}
	}
	private tone(frequency: number, length: number, volume = 0.045, offset = 0) {
		if (!this.context || this.context.state !== 'running') return;
		const now = this.context.currentTime + offset;
		const oscillator = this.context.createOscillator(),
			gain = this.context.createGain();
		oscillator.type = 'triangle';
		oscillator.frequency.setValueAtTime(frequency, now);
		gain.gain.setValueAtTime(volume, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + length);
		oscillator.connect(gain);
		gain.connect(this.context.destination);
		oscillator.start(now);
		oscillator.stop(now + length);
		oscillator.onended = () => {
			oscillator.disconnect();
			gain.disconnect();
		};
	}
	cue(kind: 'good' | 'bad' | 'drink' | 'start' | 'end') {
		if (!this.settings.sound) return;
		const notes =
			kind === 'bad' || kind === 'end'
				? [220, 110]
				: kind === 'drink'
					? [440, 660, 880]
					: [523, 784];
		notes.forEach((note, i) => this.tone(note, 0.12, 0.06, i * 0.085));
	}
	update(phase: Phase) {
		if (!this.context || !this.settings.music || phase !== 'playing') {
			this.nextBeat = 0;
			return;
		}
		if (this.context.currentTime >= this.nextBeat) {
			this.tone([130.81, 164.81, 196, 164.81][this.beat++ % 4], 0.15, 0.025);
			this.nextBeat = this.context.currentTime + 0.3;
		}
	}
	dispose() {
		void this.context?.close().catch(() => {});
	}
}
