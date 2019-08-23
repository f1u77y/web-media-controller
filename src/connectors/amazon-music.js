'use strict';

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

        this.length_last = 0;
        this.length_title = '';

        Utils.query('.playbackControlsView').then(elem => this.observe(elem));
    }

    get playbackStatus() {
        return Utils.query('span.playButton').then(elem => {
            return elem.classList.contains("playerIconPause") ? 'playing' : 'paused';
        });
    }

    get length() {
        var title = document.querySelector(this.titleSelector).innerText;
        var remaining = document.querySelector(".listViewDuration").innerText.split(':');
        var remaining_ms = -parseInt(remaining[0]) * 60000 + parseInt(remaining[1]) * 1000;
        var progress = 0.01 * parseFloat(document.querySelector("div.scrubberHandle")['style']['left']);
        var length = Math.floor(remaining_ms / (1 - progress));
        var diff = Math.abs(length - this.length_last);
        if (title != this.length_title || diff > 2000 && progress < 0.5) {
            if (length == 0 || isNaN(length)) return undefined;
            this.length_last = length;
            this.length_title = title;
            return length;
        } else {
            return this.length_last;
        }
    }

    get currentTime() {
        var remaining = document.querySelector(".listViewDuration").innerText.split(':');
        if (remaining[0] == "") return undefined;
        var remaining_ms = -parseInt(remaining[0]) * 60000 + parseInt(remaining[1]) * 1000;
        return Math.floor(this.length - remaining_ms);
    }
};
