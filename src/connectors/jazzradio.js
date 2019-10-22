import { $ } from 'content/utils';
import BaseConnector from 'content/base-connector';

const connector = new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'JazzRadio';
        this.prefix = '/com/jazzradio';
        this.artistSelector = '.artist-name';
        this.titleSelector = '.track-name';
        this.lengthSelector = '.total';
        this.currentTimeSelector = '.time';
        this.artSelector = '#art img';
        this.playerSelector = '#row-player-controls';
        this.playButtonSelector = '#play-button a';
    }

    get playbackStatus() {
        if ($(this.playButtonSelector).classList.contains('icon-pause')) {
            return 'playing';
        } else {
            return 'paused';
        }
    }

    get controlsInfo() {
        return {
            canGoNext: false,
            canGoPrevious: false,
            canPlay: true,
            canPause: true,
            canSeek: false,
        };
    }

    playPause() {
        if (this.playbackStatus === 'playing') {
            $('.icon-pause').click();
        } else {
            $('.icon-play').click();
        }
    }

    get artist() {
        return $(this.artistSelector).textContent.trim().replace(/ -$/, '');
    }
}();

connector.start();
