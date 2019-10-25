import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';

const connector = new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'Amazon Video';
        this.prefix = '/com/amazon/video';

        this.titleSelector = '.title';
        this.artSelector = '.dv-fallback-packshot-image > img';

        // Go to the next episode
        this.nextButtonSelector = '.nextTitleButton';
        // Use the webplayer close button to stop playback
        this.stopButtonSelector = '.closeButtonWrapper > div.imageButton';

        this.playerSelector = '.overlaysContainer';
        this.mediaSelector = 'video[width="100%"]';
    }

    get controlsInfo() {
        return Promise.resolve({
            canGoNext: true,
            canGoPrevious: false,
            canPlay: true,
            canPause: true,
            canSeek: true,
        });
    }

    async playPause() {
        const status = await this.playbackStatus;
        if (status === 'stopped') {
            // Click on <a> tag to resume
            document.querySelector('.dvui-playButton').click();
        } else {
            // Overlay listens to pointerup event
            document
                .querySelector('.pausedOverlay')
                .dispatchEvent(new PointerEvent('pointerup'));
        }
    }

    get playbackStatus() {
        const video = document.querySelector(this.mediaSelector);
        if (video === null) {
            return 'stopped';
        } else if (video.offsetParent === null) {
            // video element isn't visible
            return 'stopped';
        } else {
            return Utils.query(this.mediaSelector)
                .then((media) => (media.paused ? 'paused' : 'playing'));
        }
    }

    get artUrl() {
        return this._artUrl();
    }

    async _artUrl() {
        const pageTitle = await Utils
            .query('.dv-node-dp-title')
            .then((elem) => elem.textContent.trim());
        const playerTitle = await this.title;
        if (pageTitle === playerTitle) {
            // Use main title image
            return Utils
                .query(this.artSelector)
                .then((node) => node.src);
        } else {
            // Look for title in carousel
            const carousel = [...document.querySelectorAll('.dv-core-title')];
            const title = carousel.find((elem) => elem.innerText === playerTitle);
            if (title === undefined) {
                return Promise.resolve(undefined);
            } else {
                return Promise.resolve(title
                    .parentNode
                    .parentNode
                    .querySelector('img')
                    .src);
            }
        }
    }

    get uniqueId() {
        return this._uniqueId();
    }

    async _uniqueId() {
        const pageTitle = await Utils
            .query('.dv-node-dp-title')
            .then((elem) => elem.textContent.trim());
        const playerTitle = await this.title;
        if (pageTitle === playerTitle) {
            // Use main title id
            const title = await Utils.query('.dvui-playButton');
            if (title === null) {
                return Promise.resolve(undefined);
            } else {
                return Promise.resolve(title.dataset.titleId);
            }
        } else {
            // Look for title in carousel
            const carousel = [...document.querySelectorAll('.dv-core-title')];
            const title = carousel.find((elem) => elem.innerText === playerTitle);
            if (title === undefined) {
                return Promise.resolve(undefined);
            } else {
                return Promise.resolve(title
                    .parentNode
                    .parentNode
                    .parentNode
                    .dataset
                    .asin);
            }
        }
    }
}();

connector.start();
