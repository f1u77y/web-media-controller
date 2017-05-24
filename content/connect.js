'use strict';

function connect(connector) {
    function getFromTab(getter, sendResponse) {
        Promise.resolve(getter)
            .then(sendResponse)
            .catch(error => sendResponse({ error }));
        return true;
    }
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.command) {
        case 'ping':
            sendResponse('pong');
            return false;

        case 'getPlaybackStatus':
            return getFromTab(connector.getPlaybackStatus(), sendResponse);
        case 'getVolume':
            return getFromTab(connector.getVolume(), sendResponse);
        case 'getTrackInfo':
            return getFromTab(connector.getTrackInfo(), sendResponse);
        case 'getProperties':
            return getFromTab(connector.getProperties(), sendResponse);
        case 'getCurrentTime':
            return getFromTab(connector.getCurrentTime(), sendResponse);

        case 'play':
            connector.play();
            break;
        case 'pause':
            connector.pause();
            break;
        case 'playPause':
            connector.playPause();
            break;
        case 'stop':
            connector.stop();
            break;
        case 'previous':
            connector.previous();
            break;
        case 'next':
            connector.next();
            break;
        case 'seek':
            connector.seek(message.argument);
            break;
        case 'setPosition':
            connector.position = message.argument;
            break;
        case 'volume':
            connector.volume = message.argument;
            break;
        }

        return false;
    });
}
