'use strict';

/* global BaseConnector */

chrome.runtime.sendMessage({ command: 'show-page-action' });

class Connector extends BaseConnector {
    constructor(properties) {
        super(properties);
        this.injectScript('vendor/underscore-min.js');
        this.injectScript('content/vk-dom-inject.js');
        this.statusToCommand = {
            playing: 'play',
            paused: 'pause',
            stopped: 'stop'
        };

        window.addEventListener('message', ({data}) => {
            if (data.sender !== 'wmc-player') {
                return;
            }

            const newTrackInfo = _.deepMap(data.trackInfo, _.unescape);

            if (newTrackInfo && !_.isEqual(newTrackInfo, this.lastTrackInfo)) {
                this.onNewTrack(newTrackInfo);
            }

            if (['play', 'progress', 'pause', 'stop'].includes(data.type)) {
                this.sendMessage(data.type, data.currentTime);
            } else if (data.type === 'volume') {
                this.sendMessage(data.type, data.volume);
            }
        });

        this.addGetter('playback-status', () => {
            return this.getFromPage('playback-status');
        });
    }

    onMessage(message, sendResponse) {
        switch (message.command) {
        case 'reload':
            this.sendMessage('load');
            this.setProperties(this.properties);
            this.getFromPage('track-info').then(trackInfo => {
                this.onNewTrack(trackInfo);
            });
            this.getFromPage('volume').then(volume => {
                this.sendMessage('volume', volume);
            });
            this.getFromPage('playback-status').then(status => {
                this.sendMessage(this.statusToCommand[status]);
            });
            return false;
        default:
            window.postMessage(_(message).extendOwn({ sender: 'wmc-proxy' }), '*');
            return false;
        }
    }
}

const connector = new Connector({
    'can-control': true,
    'can-go-next': true,
    'can-go-previous': true,
    'can-play': true,
    'can-pause': true,
    'can-seek': true,
});
