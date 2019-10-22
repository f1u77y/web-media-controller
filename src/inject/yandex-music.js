import { PageHelper } from 'content/inject-utils';

new class extends PageHelper {
    constructor() {
        super();
        this.sendUpdatedProperties([
            'playbackStatus',
            'trackInfo',
            'controlsInfo',
            'volume',
            'currentTime',
        ]);
        this.api = window.externalAPI;
        this.api.on(this.api.EVENT_STATE, () => this.sendUpdatedProperties(['playbackStatus']));
        this.api.on(this.api.EVENT_TRACK, () => this.sendUpdatedProperties(['trackInfo']));
        this.api.on(this.api.EVENT_CONTROLS, () => this.sendUpdatedProperties(['controlsInfo']));
        this.api.on(this.api.EVENT_VOLUME, () => this.sendUpdatedProperties(['volume']));
        this.api.on(this.api.EVENT_PROGRESS, () => this.sendUpdatedProperties(['currentTime']));
    }

    play() {
        this.api.togglePause(false);
    }

    pause() {
        this.api.togglePause(true);
    }

    playPause() {
        this.api.togglePause();
    }

    next() {
        this.api.next();
    }

    previous() {
        this.api.prev();
    }

    seek(offset) {
        this.currentTime = this.currentTime + offset;
    }

    set currentTime(currentTime) {
        this.api.setPosition(currentTime / 1000);
    }

    set volume(volume) {
        this.api.setVolume(volume);
    }

    get playbackStatus() {
        return this.api.isPlaying() ? 'playing' : 'paused';
    }

    get volume() {
        return this.api.getVolume();
    }

    get uniqueId() {
        return this.getCurrentTrack().link.substr(1);
    }

    get trackInfo() {
        const yaInfo = this.getCurrentTrack();
        return {
            artist: yaInfo.artists.map((a) => a.title),
            album: yaInfo.album.title,
            title: yaInfo.title,
            length: yaInfo.duration * 1000,
            artUrl: `https://${yaInfo.cover.replace('%%', '400x400')}`,
        };
    }

    get currentTime() {
        return Math.floor(this.api.getProgress().position * 1000);
    }

    get controlsInfo() {
        const controls = this.api.getControls();
        return {
            canGoNext: controls.next === this.api.CONTROL_ENABLED,
            canGoPrevious: controls.prev === this.api.CONTROL_ENABLED,
            canPlay: true,
            canPause: true,
            canSeek: true,
        };
    }

    getCurrentTrack() {
        return this.api.getCurrentTrack() || { link: '', artists: [], duration: 0, cover: '', album: { title: '' }, title: '' };
    }
}();
