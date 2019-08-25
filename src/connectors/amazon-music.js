import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'Amazon Music';
        this.prefix = '/com/amazon/music';

        this.artistSelector = '.trackArtist > a > span';
        this.titleSelector = '.trackTitle > a > span';
        this.albumSelector = '.trackSourceLink > span > a';
        this.artSelector = '.trackAlbumArt > span > div > img';

        this.playButtonSelector = 'span.playbackControls span.playButton';
        this.prevButtonSelector = 'span.playbackControls span.previousButton';
        this.nextButtonSelector = 'span.playbackControls span.nextButton';

        this.lengthLast = 0;
        this.lengthTitle = '';

        Utils.query('.playbackControlsView').then((elem) => this.observe(elem));
    }

    get playbackStatus() {
        return Utils.query('span.playButton').then((elem) => (elem.classList.contains('playerIconPause') ? 'playing' : 'paused'));
    }

    get length() {
        const title = document.querySelector(this.titleSelector).innerText;
        let remaining = document.querySelector('.listViewDuration').innerText.split(':');
        remaining = -parseInt(remaining[0]) * 60000 + parseInt(remaining[1]) * 1000;
        const progress = 0.01 * parseFloat(document.querySelector('div.scrubberHandle')['style']['left']);
        const length = Math.floor(remaining / (1 - progress));
        const diff = Math.abs(length - this.lengthLast);
        if (title !== this.lengthTitle || diff > 2000 && progress < 0.5) {
            if (length === 0 || isNaN(length)) return undefined;
            this.lengthLast = length;
            this.lengthTitle = title;
            return length;
        } else {
            return this.lengthLast;
        }
    }

    get currentTime() {
        let remaining = document.querySelector('.listViewDuration').innerText.split(':');
        if (remaining[0] === '') return undefined;
        remaining = -parseInt(remaining[0]) * 60000 + parseInt(remaining[1]) * 1000;
        return Math.floor(this.lengthLast - remaining);
    }
}();
