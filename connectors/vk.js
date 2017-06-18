'use strict';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'VK';
        this.prefix = '/com/vk';
        this.injectScript('vendor/underscore-min.js')
            .then(() => this.injectScript('inject/common.js'))
            .then(() => this.injectScript('inject/vk.js'))
            .then(() => this.listenPage());
    }

    play() { this.sendToPage('play'); }
    pause() { this.sendToPage('pause'); }
    playPause() { this.sendToPage('playPause'); }
    stop() { this.sendToPage('stop'); }
    previous() { this.sendToPage('previous'); }
    next() { this.sendToPage('next'); }
    seek(offset) { this.sendToPage('seek', offset); }
    set currentTime(currentTime) {
        this.sendToPage('setPosition', currentTime);
    }
    set volume(volume) { this.sendToPage('setVolume', volume); }

    get playbackStatus() { return this.getFromPage('playbackStatus'); }
    get currentTime() { return this.getFromPage('currentTime'); }
    get volume() { return this.getFromPage('volume'); }
    get uniqueId() {
        return this.getFromPage('songId');
    }
    get trackInfo() {
        return Promise.all([this.getFromPage('trackInfo'), this.trackId])
            .then(([trackInfo, trackId]) => _(trackInfo).extendOwn({ trackId }));
    }
};
