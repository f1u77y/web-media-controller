import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';

const connector = new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'Amazon Video';
        this.prefix = '/com/amazon/www';

        this.titleSelector = '.title';

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
            document.querySelector('.js-deeplinkable').click();
        } else {
            // Overlay listens to pointerup event
            document
                .querySelector('.pausedOverlay')
                .dispatchEvent(new PointerEvent('pointerup'));
        }
    }

    parsePlaybackStatus(elem) {
        const classList = elem.classList;
        if (classList.contains('pausedIcon') || classList.contains('animatedPausedIcon')) {
            return 'playing';
        } else if (classList.contains('playIcon') || classList.contains('animatedPlayIcon')) {
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
        let remaining = document
            .querySelector('.timeRemaining')
            .innerText
            .replace('/ ', '')
            .split(':');
        remaining = parseInt(remaining[0]) * 60000 + parseInt(remaining[1]) * 1000;
        let elapsed = document
            .querySelector('.time')
            .innerText
            .split(' ')[0]
            .split(':');
        elapsed = parseInt(elapsed[0]) * 60000 + parseInt(elapsed[1]) * 1000;
        return elapsed + remaining;
    }

    get currentTime() {
        let elapsed = document
            .querySelector('.time')
            .innerText
            .split(' ')[0].split(':');
        elapsed = parseInt(elapsed[0]) * 60000 + parseInt(elapsed[1]) * 1000;
        return elapsed;
    }
}();

connector.start();
