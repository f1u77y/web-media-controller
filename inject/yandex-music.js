'use strict';

import { PageHelper } from 'inject/common';

new class extends PageHelper {
    constructor() {
        super();
        externalAPI.on(externalAPI.EVENT_READY, () => {
            this.changeProperties([
                'playbackStatus',
                'trackInfo',
                'properties',
                'volume',
                'currentTime',
            ]);
            externalAPI.on(externalAPI.EVENT_STATE, () => this.changeProperties(['playbackStatus']));
            externalAPI.on(externalAPI.EVENT_TRACK, () => this.changeProperties(['trackInfo']));
            externalAPI.on(externalAPI.EVENT_CONTROLS, () => this.changeProperties(['properties']));
            externalAPI.on(externalAPI.EVENT_VOLUME, () => this.changeProperties(['volume']));
            externalAPI.on(externalAPI.EVENT_PROGRESS, () => this.changeProperties(['currentTime']));
        });
    }

    play() {
        externalAPI.togglePause(false);
    }

    pause() {
        externalAPI.togglePause(true);
    }

    playPause() {
        externalAPI.togglePause();
    }

    next() {
        externalAPI.next();
    }

    previous() {
        externalAPI.prev();
    }

    seek(offset) {
        this.currentTime = this.currentTime + offset;
    }

    set currentTime(currentTime) {
        externalAPI.setPosition(currentTime / 1000);
    }

    set volume(volume) {
        externalAPI.setVolume(volume);
    }

    get playbackStatus() {
        return externalAPI.isPlaying() ? 'playing' : 'paused';
    }

    get volume() {
        return externalAPI.getVolume();
    }

    get uniqueId() {
        return externalAPI.getCurrentTrack().link.substr(1);
    }

    get trackInfo() {
        const yaInfo = externalAPI.getCurrentTrack();
        return {
            artist: yaInfo.artists.map(a => a.title),
            album: yaInfo.album.title,
            title: yaInfo.title,
            length: yaInfo.duration * 1000,
            artUrl: 'https://' + yaInfo.cover.replace('%%', '400x400'),
        };
    }

    get currentTime() {
        return Math.floor(externalAPI.getProgress().position * 1000);
    }

    get properties() {
        const controls = externalAPI.getControls();
        return {
            canGoNext: controls.next === externalAPI.CONTROL_ENABLED,
            canGoPrevious: controls.prev === externalAPI.CONTROL_ENABLED,
            canPlay: true,
            canPause: true,
            canSeek: true,
            canControl: true,
        };
    }
};
