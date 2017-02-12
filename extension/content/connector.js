'use strict';

/* global chrome */
/* global _ */

class BaseConnector {
    sendMessage(message) {
        chrome.runtime.sendMessage(_(message).pick('command', 'argument'));
    }

    resetProperties() {
        this.sendMessage({ command: 'load' });
        this.setProperties(this.properties);
    }

    setProperties(props) {
        chrome.runtime.sendMessage({
            command: 'set',
            argument: false,
        });
        chrome.runtime.sendMessage({
            command: 'set',
            argument: props,
        });
    }
}
