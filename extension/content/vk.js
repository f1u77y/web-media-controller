'use strict';

/* global chrome */
/* global _ */
/* global BaseConnector */


class Connector extends BaseConnector {
    constructor(properties) {

        this.properties = properties;

        const script = document.createElement('script');
        script.src = chrome.extension.getURL('content/vk-dom-inject.js');
        (document.head || document.documentElement).appendChild(script);

        this.lastTrackInfo = null;

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

    onNewTrack(newTrackInfo) {
        this.sendMessage({
            command: 'metadata',
            argument: newTrackInfo,
        });
        this.lastTrackInfo = newTrackInfo;
    }

    onConnect() {
        this.resetProperties();
        this.lastTrackInfo = null;
        window.postMessage({
            sender: 'vkpc-proxy',
            command: 'reconnect',
        }, '*');
    }

    onMessage(message) {
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
