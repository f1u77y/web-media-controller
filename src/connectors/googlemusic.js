import { $ } from 'content/utils';
import BaseConnector from 'content/base-connector';

const connector = new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Google Play Music';
        this.prefix = '/com/google';

        this.artistSelector = '#player-artist';
        this.titleSelector = '#currently-playing-title';
        this.albumSelector = '.player-album';
        this.progressSelector = '#material-player-progress';
        this.volumeSelector = '#material-vslider';
        this.artSelector = '#playerBarArt';

        this.playButtonSelector = '#player-bar-play-pause';
        this.prevButtonSelector = '#player-bar-rewind';
        this.nextButtonSelector = '#player-bar-forward';

        this.playerSelector = '#player';
    }

    get playbackStatus() {
        if ($(this.playButtonSelector).classList.contains('playing')) {
            return 'playing';
        } else {
            return 'paused';
        }
    }

    get artUrl() {
        return super.artUrl.replace('=s90-c-e100', '');
    }
}();

connector.start();
