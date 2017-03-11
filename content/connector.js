'use strict';

/* global chrome */
/* global _ */

class BaseConnector {
    constructor(properties) {
        this.setProperties(properties);
        this.sendMessage({command: 'load'});
    }

    sendMessage(message) {
        chrome.runtime.sendMessage(_(message).pick('command', 'argument'));
    }

    resetProperties() {
        this.sendMessage({ command: 'load' });
        this.setProperties(this.properties);
    }

    setProperties(props) {
        this.properties = props;
        chrome.runtime.sendMessage({
            command: 'set',
            argument: props,
        });
    }

    onNewTrack(newTrackInfo) {
        this.sendMessage({
            command: 'metadata',
            argument: newTrackInfo,
        });
        this.lastTrackInfo = newTrackInfo;
    }

    injectScript(url) {
        const script = document.createElement('script');
        script.src = chrome.extension.getURL(url);
        (document.head || document.documentElement).appendChild(script);
    }
}
