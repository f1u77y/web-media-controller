'use strict';

/* global chrome */
/* global _ */

_.mixin({
    deepMap: function deepMap(object, f) {
        if (_.isArray(object)) {
            return _(object).map(_.partial(deepMap, _, f));
        } else if (_.isObject(object)) {
            return _(object).mapObject(_.partial(deepMap, _, f));
        } else if (_.isString(object)) {
            return f(object);
        } else {
            return object;
        }
    }
});

const script = document.createElement('script');
script.src = chrome.extension.getURL('content/vk-dom-inject.js');
(document.head || document.documentElement).appendChild(script);

let lastTrackInfo = null;

window.addEventListener('message', (event) => {
    if (event.data.sender !== 'vkpc-player') {
        return;
    }

    const newTrackInfo = _.deepMap(event.data.trackInfo, _.unescape);

    if (newTrackInfo && !_.isEqual(newTrackInfo, lastTrackInfo)) {
        chrome.runtime.sendMessage({
            command: 'metadata',
            argument: newTrackInfo,
        });
        lastTrackInfo = newTrackInfo;
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

function reconnect() {
    chrome.runtime.sendMessage({command: 'load'});
    chrome.runtime.sendMessage({
        command: 'set',
        argument: false,
    });
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
    lastTrackInfo = null;
    window.postMessage({
        sender: 'vkpc-proxy',
        command: 'reconnect',
    }, '*');
}
reconnect();

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.sender !== 'vkpc-proxy') {
        return;
    }
    switch (message.command) {
    case 'reconnect':
        reconnect();
        break;
    default:
        window.postMessage({
            sender: 'vkpc-proxy',
            command: message.command,
            argument: message.argument,
        }, '*');
    }
});
