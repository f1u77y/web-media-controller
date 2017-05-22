'use strict';

/* global BaseConnector */
/* global connect */

class Connector extends BaseConnector {
    constructor() {
        super();
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
        this.sendToPage('setPosition', { trackId, position });
    }
    setVolume(volume) { this.sendToPage('setVolume', volume); }

    isPlaying() { return this.getFromPage('isPlaying'); }
    isStopped() { return this.getFromPage('isStopped'); }
    getCurrentTime() { return this.getFromPage('currentTime'); }
    getVolume() { return this.getFromPage('volume'); }
    getTrackInfo() { return this.getFromPage('trackInfo'); }
}

connect(new Connector());
