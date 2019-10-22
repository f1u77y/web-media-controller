import { $ } from 'content/utils';
import BaseConnector from 'content/base-connector';
import _ from 'underscore';

const connector = new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Bilibili';
        this.prefix = '/com/bilibili';

        this.artistSelector = 'a[class*="name"]';
        this.titleSelector = 'h1';

        this.currentTimeSelector = '.bilibili-player-video-time-now';
        this.lengthSelector = '.bilibili-player-video-time-total';

        this.playButtonSelector =
            '.bilibili-player-video-btn.bilibili-player-video-btn-start';
        this.nextButtonSelector = '.bilibili-player-video-btn-next';

        this.playerSelector = 'div#bofqi';
    }

    get playbackStatus() {
        const player = $('.bilibili-player-video-btn');
        if (!player) {
            return 'stopped';
        } else if (player.classList.contains('video-state-pause')) {
            return 'paused';
        } else {
            return 'playing';
        }
    }

    get controlsInfo() {
        const hasNextButton = $(this.nextButtonSelector) !== null;
        return _(super.controlsInfo).extend({
            canGoPrevious: false,
            canSeek: false,
            canStop: false,
            canGoNext: hasNextButton,
        });
    }
}();

connector.start();
