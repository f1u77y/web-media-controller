'use strict';

class BaseConnector {
    constructor() {
        this.sendCommand('showPageAction');
        this.sendProperty('load');
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
                if (data.sender   !== 'wmc-page'   ||
                    data.type     !== 'getFromPage' ||
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
                sender: 'wmc-connector',
                command: 'getFromPage',
                property,
                id: currentId,
            }, '*');
        });
    }

    sendToPage(command, argument = null) {
        window.postMessage({
            sender: 'wmc-connector',
            command,
            argument,
        }, '*');
    }

    listenPage() {
        this.onStateChanged();
        window.addEventListener('message', ({data}) => {
            if (data.sender !== 'wmc-page') return;

            for (let name of this.propertyNames) {
                if (data[name] != null) {
                    this.onPropertyChanged(data[name], name);
                }
            }
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

    observe(selector) {
        const observerOptions = {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        };
        const stateChangeObserver = new MutationObserver(() => {
            this.onStateChanged();
        });
        let observedElement = document.querySelector(selector);
        if (observedElement) {
            stateChangeObserver.observe(observedElement, observerOptions);
        } else {
            const findObserver = new MutationObserver((mutations, observer) => {
                observedElement = document.querySelector(selector);
                if (observedElement) {
                    observer.disconnect();
                    stateChangeObserver.observe(observedElement, observerOptions);
                }
            });
            findObserver.observe(document.documentElement, observerOptions);
        }
    }

    isPlaying() {}
    isStopped() {
        return false;
    }

    play() {
        Promise.resolve(this.isPlaying()).then(isPlaying => {
            if (!isPlaying) {
                this.playPause();
            }
        });
    }
    pause() {
        Promise.resolve(this.isPlaying()).then(isPlaying => {
            if (isPlaying) {
                this.playPause();
            }
        });
    }
    playPause() {
        Promise.resolve(this.isPlaying()).then(isPlaying => {
            if (isPlaying) {
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
    setPosition() {}
    setVolume() {}

    getPlaybackStatus() {
        let scope = {};
        return Promise.resolve(this.isStopped())
            .then(isStopped => {
                scope.isStopped = isStopped;
                return Promise.resolve(this.isPlaying());
            })
            .then(isPlaying => {
                scope.isPlaying = isPlaying;
            })
            .then(() => {
                if (scope.isStopped) {
                    return 'stopped';
                } else if (scope.isPlaying) {
                    return 'playing';
                } else {
                    return 'paused';
                }
            });
    }
    getCurrentTime() {}
    getVolume() {}
    getCanProperties() {
        return {
            canGoNext: true,
            canGoPrevious: true,
            canPlay: true,
            canPause: true,
            canSeek: true,
            canControl: true,
        };
    }

    getLength() {}
    getArtist() {}
    getAlbum() {}
    getTitle() {}
    getArtUrl() {}
    getTrackInfo() {
        return Promise.all([
            this.getLength(),
            this.getArtist(),
            this.getAlbum(),
            this.getTitle(),
            this.getArtUrl(),
        ]).then(([length, artist, album, title, artUrl]) => {
            return { length, artist, album, title, artUrl };
        });
    }

    onPropertyChanged(getter, name) {
        const throttle = this.throttleInterval[name];
        if (throttle != null) {
            const now = Date.now();
            if (now - this.lastCallTime.get(name) < throttle) return;
            this.lastCallTime.set(name, now);
        }

        Promise.resolve(getter).
            then(curValue => {
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

    onStateChanged() {
        this.onPropertyChanged(this.getCanProperties(), 'canProperties');
        this.onPropertyChanged(this.getPlaybackStatus(), 'playbackStatus');
        this.onPropertyChanged(this.getTrackInfo(), 'trackInfo');
        this.onPropertyChanged(this.getVolume(), 'volume');
        this.onPropertyChanged(this.getCurrentTime(), 'currentTime');
    }
}
