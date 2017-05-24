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
    setPosition({ trackId, position }) {
        Promise.resolve(this.getTrackId())
            .then(curTrackId => {
                if (curTrackId !== trackId) return;
                this.sendToPage('setPosition', position);
            });
    }
    setVolume(volume) { this.sendToPage('setVolume', volume); }

    getPlaybackStatus() { return this.getFromPage('playbackStatus'); }
    getCurrentTime() { return this.getFromPage('currentTime'); }
    getVolume() { return this.getFromPage('volume'); }
    getTrackId() {
        return this.getFromPage('songId')
            .then(songId => {
                const trackId = `${this.objectPrefix}/${songId}`;
                return trackId;
            });
    }
    getTrackInfo() {
        return Promise.all([this.getFromPage('trackInfo'), this.getTrackId()])
            .then(([trackInfo, trackId]) => _(trackInfo).extendOwn({ trackId }));
    }
}

connect(new Connector());
