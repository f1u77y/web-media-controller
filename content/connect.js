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
            return connector.play();
        case 'pause':
            return connector.pause();
        case 'playPause':
            return connector.playPause();
        case 'stop':
            return connector.stop();
        case 'previous':
            return connector.previous();
        case 'next':
            return connector.next();
        case 'seek':
            return connector.seek(message.argument);
        case 'setPosition':
            return connector.setPosition(message.argument);
        case 'volume':
            return connector.setVolume(message.argument);
        }

        return false;
    });
}
