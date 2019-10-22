import { $ } from 'content/utils';
import BaseConnector from 'content/base-connector';

const connector = new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Spotify';
        this.prefix = '/com/spotify';

        this.artistsSelector = '.Root__now-playing-bar .track-info__artists a';
        this.titleSelector = '.Root__now-playing-bar .track-info__name a';

        this.currentTimeSelector = '.playback-bar__progress-time:first-child';
        this.lengthSelector = '.playback-bar__progress-time:last-child';

        this.playButtonSelector = '.control-button[class*="spoticon-play-"],.control-button[class*="spoticon-pause-"]';

        this.prevButtonSelector = '.control-button[class*="spoticon-skip-back-"]';
        this.nextButtonSelector = '.control-button[class*="spoticon-skip-forward-"]';
        this.artSelector = '.now-playing__cover-art .cover-art-image';

        this.playerSelector = '.now-playing-bar';
    }

    get playbackStatus() {
        const buttons = $('.player-controls__buttons');
        const playButton = buttons.querySelector('.control-button[class*="spoticon-play-"]');
        return playButton ? 'paused' : 'playing';
    }
}();

connector.start();
