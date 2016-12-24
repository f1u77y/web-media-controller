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
chrome.runtime.sendMessage({command: 'reset'});
chrome.runtime.sendMessage({
    command: 'set',
    argument: {
        'can-control': true,
        'can-go-next': true,
        'can-go-previous': true,
        'can-play': true,
        'can-pause': true,
        'can-seek': true,
    }
});

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
