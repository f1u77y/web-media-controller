'use strict';

/* global connector */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.command) {
    case 'reconnect':
        connector.onReconnect();
        break;
    default:
        return connector.onMessage(_(message).pick('command', 'argument'), sendResponse);
    }
});
