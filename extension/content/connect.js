'use strict';

/* global chrome */
/* global _ */
/* global connector */

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.sender !== 'vkpc-proxy') {
        return;
    }
    switch (message.command) {
    case 'reconnect':
        connector.onReconnect();
    default:
        connector.onMessage(_(message).pick('command', 'argument'));
    }
});
