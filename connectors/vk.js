'use strict';

/* global BaseConnector */
/* global connect */

class Connector extends BaseConnector {
    constructor() {
        super();
        this.objectPrefix = `${this.objectPrefix}/com/vk`;
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
    set position({ trackId, position }) {
        Promise.resolve(this.trackId)
            .then(curTrackId => {
                if (curTrackId !== trackId) return;
                this.sendToPage('setPosition', position);
            });
    }
    set volume(volume) { this.sendToPage('setVolume', volume); }

    get playbackStatus() { return this.getFromPage('playbackStatus'); }
    get currentTime() { return this.getFromPage('currentTime'); }
    get volume() { return this.getFromPage('volume'); }
    get trackId() {
        return this.getFromPage('songId')
            .then(songId => {
                const trackId = `${this.objectPrefix}/${songId}`;
                return trackId;
            });
    }
    get trackInfo() {
        return Promise.all([this.getFromPage('trackInfo'), this.trackId])
            .then(([trackInfo, trackId]) => _(trackInfo).extendOwn({ trackId }));
    }
}

connect(new Connector());
