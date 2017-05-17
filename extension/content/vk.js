'use strict';

/* global BaseConnector */

chrome.runtime.sendMessage({ command: 'show-page-action' });

class Connector extends BaseConnector {
    constructor(properties) {
        super(properties);
        this.injectScript('vendor/underscore-min.js');
        this.injectScript('content/vk-dom-inject.js');

        window.addEventListener('message', (event) => {
            if (event.data.sender !== 'vkpc-player') {
                return;
            }

            const newTrackInfo = _.deepMap(event.data.trackInfo, _.unescape);

            if (newTrackInfo && !_.isEqual(newTrackInfo, this.lastTrackInfo)) {
                this.onNewTrack(newTrackInfo);
            }

            if (['start', 'progress', 'pause', 'stop'].includes(event.data.type)) {
                this.sendMessage({
                    command: (event.data.type !== 'start' ? event.data.type : 'play'),
                    argument: event.data.currentTime,
                });
            }
        });
    }

    onMessage(message) {
        if (message.command === 'reload') {
            this.sendMessage({ command: 'load' });
            this.setProperties(this.properties);
        }
        window.postMessage(_(message).extendOwn({ sender: 'vkpc-proxy' }), '*');
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
