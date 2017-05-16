'use strict';

class BaseConnector {
    constructor(properties) {
        this.properties = properties;
        this.onReconnect();
    }

    sendMessage(message) {
        chrome.runtime.sendMessage(_(message).pick('command', 'argument'));
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

    onReconnect() {
        this.sendMessage({ command: 'load' });
        this.setProperties(this.properties);
        this.lastTrackInfo = null;
    }

    injectScript(url) {
        const script = document.createElement('script');
        script.src = chrome.extension.getURL(url);
        (document.head || document.documentElement).appendChild(script);
    }
}
