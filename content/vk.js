'use strict';

/* global BaseConnector */

chrome.runtime.sendMessage({ command: 'show-page-action' });

class Connector extends BaseConnector {
    constructor(properties) {
        super(properties);
        this.injectScript('vendor/underscore-min.js');
        this.injectScript('content/vk-dom-inject.js');
        this.statusId = 0;

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

    onMessage(message, sendResponse) {
        if (message.command === 'reload') {
            this.sendMessage({ command: 'load' });
            this.setProperties(this.properties);
        }
        if (message.command === 'get-playback-status') {
            const currentId = this.statusId++;
            window.addEventListener('message', function sendPlaybackStatus(event) {
                if (event.data.sender !== 'vkpc-player') {
                    return;
                }
                if (event.data.type !== 'get-playback-status') {
                    return;
                }
                if (event.data.id === currentId) {
                    console.log(`vk.js: status = ${event.data.status}`);
                    window.removeEventListener('message', sendPlaybackStatus);
                    console.log(`sendResponse is ${typeof sendResponse}`);
                    sendResponse(event.data.status);
                }
            });
            window.postMessage(_(message).extendOwn({
                sender: 'vkpc-proxy',
                id: currentId
            }), '*');
            return true;
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
