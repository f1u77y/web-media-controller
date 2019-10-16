import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';

const connector = new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'JazzRadio';
        this.prefix = '/com/jazzradio';
        this.artistSelector = '.artist-name';
        this.titleSelector = '.track-name';
        this.lengthSelector = '.total';
        this.currentTimeSelector = '.time';
        this.artSelector = '#art';
        this.playerSelector = '#row-player-controls';
    }

    get playbackStatus() {
        return Utils.query('#play-button a').then((icon) => {
            if (icon.classList.contains('icon-pause')) {
                return 'playing';
            } else {
                return 'paused';
            }
        });
    }

    get controlsInfo() {
        return Promise.resolve({
            canGoNext: false,
            canGoPrevious: false,
            canPlay: true,
            canPause: true,
            canSeek: false,
        });
    }

    playPause() {
        this.playbackStatus.then((status) => {
            if (status === 'playing') {
                Utils.queryClick('.icon-pause');
            } else {
                Utils.queryClick('.icon-play');
            }
        });
    }

    get artist() {
        return Utils.query(this.artistSelector)
            .then((node) => node.textContent.trim().replace(/ -$/, ''));
    }
}();

connector.start();
