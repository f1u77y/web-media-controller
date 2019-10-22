import { $ } from 'content/utils';
import BaseConnector from 'content/base-connector';
import MetadataFilter from 'content/filter';
import _ from 'underscore';

const connector = new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'listen.moe';
        this.prefix = '/moe/listen';

        this.artistsSelector = '.hero-body .player .player-song-artist';
        this.titleSelector = '.player-song-title';
        this.playButtonSelector = [ '.icon-music-play', '.icon-music-pause-a' ];
        this.progressSelector = '.progress';
        this.playerSelector = '.playerContainer';

        this.metadataFilter = MetadataFilter.trimFilter();
    }

    get currentTime() { return 0 }

    get volume() { return 1 }

    get playbackStatus() {
        if ($(this.playButtonSelector).classList.contains('icon-music-pause-a')) {
            return 'playing';
        } else {
            return 'paused';
        }
    }

    get controlsInfo() {
        return _(super.controlsInfo).extendOwn({
            canGoPrevious: false,
            canGoNext: false,
            canSeek: false,
        });
    }
}();

connector.start();
