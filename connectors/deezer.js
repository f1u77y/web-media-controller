'use strict';

/* global BaseConnector */
/* global connect */

chrome.runtime.sendMessage({ command: 'show-page-action' });

class Connector extends BaseConnector {
    constructor(properties) {
        super(properties);
        this.addGetter('playback-status', () => {
            return this.playbackStatus;
        });
        this.statusToCommand = {
            playing: 'play',
            paused: 'pause',
            stopped: 'stop',
        };
        this.onStateChanged();
        this.lastPlaybackStatus = null;
        this.lastVolume = null;
        this.lastCurrentTime = null;
        this.lastOnCurrentTimeCall = 0;
        this.observe('#player');
    }

    get playButton() {
        return document.querySelector('.control-play');
    }

    get prevButton() {
        return document.querySelector('.control-prev');
    }

    get nextButton() {
        return document.querySelector('.control-next');
    }

    isPlaying() {
        const svg = document.querySelector('.control-play svg');
        return svg ? svg.classList.contains('svg-icon-pause') : false;
    }

    get playbackStatus() {
        if (this.isPlaying()) {
            return 'playing';
        } else {
            return 'paused';
        }
    }

    get progressHandler() {
        return document.querySelector('.progress-handler');
    }

    get currentTime() {
        const ph = this.progressHandler;
        const secs = ph ? parseFloat(ph.getAttribute('aria-valuenow')) : 0;
        return secs * 1000;
    }

    get length() {
        const ph = this.progressHandler;
        const secs = ph ? parseFloat(ph.getAttribute('aria-valuemax')) : 0;
        return secs * 1000;
    }

    get artist() {
        const elem = document.querySelector('.player-track-artist .player-track-link');
        return elem ? elem.textContent : undefined;
    }

    get album() {
        return undefined;
    }

    get title() {
        const elem = document.querySelector('.player-track-title .player-track-link');
        return elem ? elem.textContent : undefined;
    }

    get trackInfo() {
        return {
            artist: this.artist,
            title: this.title,
            length: this.length,
            'art-url': this.artUrl,
        };
    }

    get volume() {
        const elem = document.querySelector('.volume-handler');
        return elem ? elem.getAttribute('aria-valuenow') / 100 : 1;
    }

    get artUrl() {
        const elem = document.querySelector('#player-cover img');
        return elem ? elem.src : undefined;
    }

    onPlaybackStatusChanged(curStatus) {
        if (curStatus !== this.lastPlaybackStatus) {
            this.lastPlaybackStatus = curStatus;
            this.sendMessage(this.statusToCommand[curStatus], null);
        }
    }

    onVolumeChanged(curVolume) {
        if (curVolume !== this.lastVolume) {
            this.lastVolume = curVolume;
            this.sendMessage('volume', curVolume);
        }
    }

    onCurrentTimeChanged() {
        const now = Date.now();
        if (now - this.lastOnCurrentTimeCall < 1000) return;
        this.lastOnCurrentTimeCall = now;

        const curCurrentTime = this.currentTime;
        if (curCurrentTime !== this.lastCurrentTime) {
            this.sendMessage('progress', curCurrentTime);
            this.lastCurrentTime = curCurrentTime;
        }
    }

    onStateChanged() {
        this.onPlaybackStatusChanged(this.playbackStatus);
        const newTrackInfo = this.trackInfo;
        if (!_.isEqual(newTrackInfo, this.lastTrackInfo)) {
            console.log(newTrackInfo);
            this.onNewTrack(newTrackInfo);
        }
        this.onVolumeChanged(this.volume);
        this.onCurrentTimeChanged();
    }

    onMessage(message) {
        switch (message.command) {
        case 'reload':
            this.sendMessage('load');
            this.setProperties(this.properties);
            return false;
        case 'play-pause':
            this.playButton.click();
            break;
        case 'play':
            if (!this.isPlaying()) {
                this.playButton.click();
            }
            break;
        case 'pause':
            if (this.isPlaying()) {
                this.playButton.click();
            }
            break;
        case 'next':
            this.nextButton.click();
            break;
        case 'previous':
            this.prevButton.click();
            break;
        }
        return false;
    }
}

connect(new Connector({
    'can-control': true,
    'can-go-next': true,
    'can-go-previous': true,
    'can-play': true,
    'can-pause': true,
    'can-seek': true,
}));
