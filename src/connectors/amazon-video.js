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

    playPause() {
        const status = this.parsePlaybackStatus(document.querySelector('.buttons div:nth-of-type(2)'));
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

    parsePlaybackStatus(elem) {
        const classList = elem.classList;
        if (classList.contains('pausedIcon')) {
            return 'playing';
        } else if (classList.contains('playIcon') || classList.contains('animatedPausedIcon')) {
            return 'paused';
        } else {
            return 'stopped';
        }
    }

    get playbackStatus() {
        return Utils
            .query('.buttons div:nth-of-type(2)')
            .then((elem) => this.parsePlaybackStatus(elem));
    }

    get length() {
        const time = document.querySelector('.time');
        if (time === null) return undefined;
        const elapsed = Utils.parseCurrentTime(time.innerText) * 1000;
        const remaining = Utils.parseLength(time.innerText) * 1000;
        return elapsed + remaining;
    }

    get currentTime() {
        const time = document.querySelector('.time');
        if (time === null) return undefined;
        const elapsed = Utils.parseCurrentTime(time.innerText) * 1000;
        return elapsed;
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
