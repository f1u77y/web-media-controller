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

        Utils.query('.overlaysContainer').then((elem) => this.observe(elem));
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

    get uniqueId() {
        const id = document.querySelector('.dvui-playButton');
        if (id === null) {
            return Promise.resolve(undefined);
        } else {
            return Promise.resolve(id.dataset['titleId']);
        }
    }
}();

connector.start();
