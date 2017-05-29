'use strict';

/* exported BaseConnector */

class BaseConnector {
    constructor() {
        this.sendCommand('showPageAction');
        this.sendCommand('load');
        this.ids = new Map();
        this.lastValue = new Map();
        this.lastCallTime = new Map();
        this.propertyNames = [
            'canProperties',
            'playbackStatus',
            'trackInfo',
            'volume',
            'currentTime',
        ];
        this.throttleInterval = { currentTime: 2000 };
        this.objectPrefix = '/me/f1u77y/web_media_controller';
        this.TRACK_ID_NONE = '/org/mpris/MediaPlayer2/TrackList/NoTrack';
    }

    set prefix(prefix) {
        this.objectPrefix = `${this.objectPrefix}${prefix}`;
    }

    sendProperty(name, value) {
        return new Promise((resolve, reject) => {
            let message = name;
            if (typeof name === 'string') {
                message = { name, value };
            }
            chrome.runtime.sendMessage(message, (status) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                } else {
                    resolve({ status, name, value });
                }
            });
        });
    }

    sendCommand(command) {
        chrome.runtime.sendMessage({ command });
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
                if (data.sender   !== 'wmc-page-getter'   ||
                    data.property !== property            ||
                    data.id       !== currentId           )
                {
                    return;
                }
                clearTimeout(tid);
                window.removeEventListener('message', handleResponse);
                resolve(data.response);
            }
            window.addEventListener('message', handleResponse);
            window.postMessage({
                sender: 'wmc-connector-getter',
                property,
                id: currentId,
            }, '*');
        });
    }

    sendToPage(command, argument = null) {
        window.postMessage({
            sender: 'wmc-connector-command',
            command,
            argument,
        }, '*');
    }

    listenPage() {
        this.onStateChanged();
        window.addEventListener('message', ({data}) => {
            if (data.sender !== 'wmc-page-notifier') return;

            this.onStateChanged(data.propertyNames);
        });
    }

    injectScript(url) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = chrome.extension.getURL(url);
            script.addEventListener('load', function onLoad() {
                resolve();
            });
            (document.head || document.documentElement).appendChild(script);
        });
    }

    query(selector) {
        return new Promise((resolve) => {
            const elem = document.querySelector(selector);
            if (elem) {
                resolve(elem);
            } else {
                const waitObserver = new MutationObserver((mutations, observer) => {
                    const elem = document.querySelector(selector);
                    if (elem) {
                        observer.disconnect();
                        resolve(elem);
                    }
                });
                waitObserver.observe(document.documentElement, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    characterData: true,
                });
            }
        });
    }

    observe(element) {
        const stateChangeObserver = new MutationObserver(() => {
            this.onStateChanged();
        });
        stateChangeObserver.observe(element, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
    }

    play() {
        Promise.resolve(this.playbackStatus).then(status => {
            if (status !== 'playing') {
                this.playPause();
            }
        });
    }

    pause() {
        Promise.resolve(this.playbackStatus).then(status => {
            if (status === 'playing') {
                this.playPause();
            }
        });
    }

    playPause() {
        Promise.resolve(this.playbackStatus).then(status => {
            if (status === 'playing') {
                this.pause();
            } else {
                this.play();
            }
        });
    }

    stop() {}
    previous() {}
    next() {}
    seek() {}
    set position({ trackId, position}) {
        Promise.resolve(this.trackId).then(curTrackId => {
            if (trackId !== curTrackId) return;
            this.currentTime = position;
        });
    }
    set currentTime(currentTime) {}
    set volume(arg) {}

    get playbackStatus() {}
    get currentTime() {}
    get volume() {}
    get canProperties() {
        return {
            canGoNext: true,
            canGoPrevious: true,
            canPlay: true,
            canPause: true,
            canSeek: true,
            canControl: true,
        };
    }

    get length() {}
    get artist() {}
    get album() {}
    get title() {}
    get artUrl() {}
    get uniqueId() {}
    get trackId() {
        return Promise.resolve(this.uniqueId).then(uniqueId => {
            if (!uniqueId) {
                return '/me/f1u77y/web_media_controller/CurrentTrack';
            } else {
                return `${this.objectPrefix}/${uniqueId}`;
            }
        });
    }
    get trackInfo() {
        return Promise.all([
            this.length, this.artist, this.album, this.title, this.artUrl, this.trackId,
        ]).then(([length, artist, album, title, artUrl, trackId]) => {
            return { length, artist, album, title, artUrl, trackId };
        });
    }

    onPropertyChanged(getter, name) {
        const throttle = this.throttleInterval[name];
        if (throttle != null) {
            const now = Date.now();
            if (now - this.lastCallTime.get(name) < throttle) return;
            this.lastCallTime.set(name, now);
        }

        Promise.resolve(getter)
            .then(curValue => {
                if (!_.isEqual(curValue, this.lastValue.get(name))) {
                    return this.sendProperty(name, curValue);
                } else {
                    return { status: 'failed' };
                }
            })
            .then(({ status, name, value }) => {
                if (status === 'done') {
                    this.lastValue.set(name, value);
                }
            });
    }

    onStateChanged(propertyNames = this.propertyNames) {
        for (let name of propertyNames) {
            this.onPropertyChanged(this[name], name);
        }
    }
}
