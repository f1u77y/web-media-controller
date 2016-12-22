'use strict';

/* global chrome */
/* global _ */

const script = document.createElement('script');
script.src = chrome.extension.getURL('content/vk-dom-inject.js');
(document.head || document.documentElement).appendChild(script);

let lastTrackInfo = null;

window.addEventListener('message', (event) => {
    if (event.data.sender !== 'vkpc-player') {
        return;
    }

    if (event.data.trackInfo && !_.isEqual(event.data.trackInfo, lastTrackInfo)) {
        chrome.runtime.sendMessage({
            command: 'metadata',
            argument: event.data.trackInfo,
        });
        lastTrackInfo = event.data.trackInfo;
    }

    switch (event.data.type) {
    case 'start':
        chrome.runtime.sendMessage({
            command: 'play',
            argument: event.data.currentTime,
        });
        break;
    case 'progress':
    case 'pause':
    case 'stop':
        chrome.runtime.sendMessage({
            command: event.data.type,
            argument: event.data.currentTime,
        });
        break;
    }
});

chrome.runtime.sendMessage({command: 'load'});
function setProperty(prop, value) {
    if (value === true) {
        chrome.runtime.sendMessage({command: 'set', argument: prop});
    } else if (value === false) {
        chrome.runtime.sendMessage({command: 'unset', argument: prop});
    }
}
setProperty('all', false);
setProperty('can-control', true);
setProperty('can-go-next', true);
setProperty('can-go-previous', true);
setProperty('can-play', true);
setProperty('can-pause', true);

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.sender !== 'vkpc-proxy') {
        return;
    }
    window.postMessage({
        sender: 'vkpc-proxy',
        command: message.command,
        argument: message.argument,
    }, '*');
});
