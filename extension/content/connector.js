'use strict';

class BaseConnector {
    constructor(properties) {
        this.properties = properties;
        this.sendMessage('load');
        this.setProperties(this.properties);
        this.lastTrackInfo = null;
        this.getters = new Map();
        this.ids = new Map();
    }

    sendMessage(command, argument = null) {
        return new Promise((resolve, reject) => {
            let message = null;
            if (typeof command === 'string') {
                message = { command, argument };
            } else {
                message = command;
            }
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                } else {
                    resolve(response);
                }
            });
        });
    }

    addGetter(property, getter) {
        this.getters.set(property, getter);
    }

    getFromTab(property) {
        return this.getters.get(property)();
    }

    getFromPage(property) {
        return new Promise((resolve, reject) => {
            const currentId = this.ids.get(property) || 0;
            this.ids.set(property, currentId + 1);
            const tid = setTimeout(() => {
                window.removeEventListener('message', handleResponse);
                reject(`Timeout: ${property}`);
            }, 2000);
            function handleResponse({data}) {
                if (data.sender   !== 'wmc-player'   ||
                    data.type     !== 'get-from-page' ||
                    data.property !== property        ||
                    data.id       !== currentId       )
                {
                    return;
                }
                window.removeEventListener('message', handleResponse);
                clearTimeout(tid);
                resolve(data.response);
            }
            window.addEventListener('message', handleResponse);
            window.postMessage({
                sender: 'wmc-proxy',
                command: 'get-from-page',
                property,
                id: currentId
            }, '*');
        });
    }

    setProperties(props) {
        this.properties = props;
        this.sendMessage('set', props);
    }

    onNewTrack(newTrackInfo) {
        this.sendMessage('metadata', newTrackInfo).then((response) => {
            if (response === 'done') {
                this.lastTrackInfo = newTrackInfo;
            }
        });
    }

    injectScript(url) {
        const script = document.createElement('script');
        script.src = chrome.extension.getURL(url);
        (document.head || document.documentElement).appendChild(script);
    }
}
