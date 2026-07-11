import { assetStore } from '../Utils/AssetStore';

export default class Preloader {
	overlay!: HTMLElement;
	loading!: HTMLElement;
	startButton!: HTMLElement;
	numberOfLoadedAssets!: number;
	numberOfAssetsToLoad!: number;
	progress!: number;
	constructor() {
		// Hiding the Screen before everything gets loaded
		this.overlay = document.querySelector('.overlay') as HTMLElement;
		this.loading = document.querySelector('.loading') as HTMLElement;
		this.startButton = document.querySelector('.start') as HTMLElement;

		assetStore.subscribe((state) => {
			this.numberOfLoadedAssets = Object.keys(state.loadedAssets).length;
			this.numberOfAssetsToLoad = state.assetsToLoad.length;
			this.progress = this.numberOfLoadedAssets / this.numberOfAssetsToLoad;

			const progressBar = document.getElementById('progressPercentage');
			if (progressBar) {
				progressBar.innerHTML = String(Math.trunc(this.progress * 100));
			}

			if (this.progress === 1) {
				this.loading.style.opacity = '0';
				window.setTimeout(() => this.ready(), 1200);
			}
		});
	}

	ready() {
		// remove the loading elelemnt from DOM
		this.loading.remove();

		// cannot add page css class here because svelte mangles it
		this.startButton.style.display = 'inline';
		this.startButton.style.opacity = '1';

		this.startButton.addEventListener(
			'click',
			() => {
				this.overlay.style.opacity = '0';
				this.startButton.style.opacity = '0';

				// remove the overlay  and startButton elelemnt from DOM
				window.setTimeout(() => {
					this.overlay.remove();
					this.startButton.remove();
				}, 2000);
			},
			{ once: true }
		);
	}
}
