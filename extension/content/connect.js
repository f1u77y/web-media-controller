'use strict';

/* global connector */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.command) {
    case 'ping':
        sendResponse('pong');
        return false;
    case 'get-from-tab':
        connector.getFromTab(message.property)
            .then(sendResponse)
            .catch((error) => sendResponse({ error }));
        return true;
    default:
        return connector.onMessage(_(message).pick('command', 'argument'), sendResponse);
    }
});
