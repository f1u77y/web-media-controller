'use strict';

/* exported BaseConnector */

const BaseConnector = (() => {
    const ids = new WeakMap();
    const lastValue = new WeakMap();
    const lastCallTime = new WeakMap();
    const propertyNames = [
        'properties',
        'playbackStatus',
        'trackInfo',
        'volume',
        'currentTime',
    ];
    const throttleInterval = { currentTime: 2000 };
    const port = new WeakMap();
    const prefix = new WeakMap();

    class BaseConnector {
        /**
         * @constructor
         * Initializes base for all connectors
         */
        constructor() {
            ids.set(this, new Map());
            lastValue.set(this, new Map());
            lastCallTime.set(this, new Map());
            prefix.set(this, '/me/f1u77y/web_media_controller');

            port.set(this, chrome.runtime.connect());
            port.get(this).onMessage.addListener((message) => {
                switch (message.command) {
                case 'play':
                    this.play();
                    break;
                case 'pause':
                    this.pause();
                    break;
                case 'playPause':
                    this.playPause();
                    break;
                case 'stop':
                    this.stop();
                    break;
                case 'previous':
                    this.previous();
                    break;
                case 'next':
                    this.next();
                    break;
                case 'seek':
                    this.seek(message.argument);
                    break;
                case 'setPosition':
                    this.position = message.argument;
                    break;
                case 'volume':
                    this.volume = message.argument;
                    break;

                case 'reload':
                    for (let name of this.propertyNames) {
                        this.sendProperty(name, lastValue.get(this).get(name));
                    }
                    break;
                }

                return false;
            });
        }

        /**
         * Add parameter to the connector object prefix. Should be called exactly one time!
         * @param {string} prefix - Connector's prefix. In most cases should be derived from domain
         */
        set prefix(addedPrefix) {
            prefix.set(this, `${prefix.get(this)}${addedPrefix}`);
        }

        /**
         * Send updated property to the background. Intended for internal usage
         * @param {string} name - Property name
         * @param {object} value - New property value
         * @param {object} message - First parameter can be object of { name, value }
         */
        sendProperty(name, value) {
            let message = name;
            if (typeof name === 'string') {
                message = { name, value };
            }
            port.get(this).postMessage(message);
        }

        /**
         * Get property from the injected script
         * @param {string} property - Property name. Should be different for different properties
         * @returns {Promise} Promise resolved with fetched value or rejected with timeout
         */
        getFromPage(property) {
            return new Promise((resolve, reject) => {
                const currentId = ids.get(this).get(property) || 0;
                ids.get(this).set(property, currentId + 1);
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

        /**
         * Send a command to injected script
         * @param {string} command - Command name
         * @param {object} argument - Optional argument
         */
        sendToPage(command, argument = null) {
            window.postMessage({
                sender: 'wmc-connector-command',
                command,
                argument,
            }, '*');
        }

        /**
         * Listen events from injected script and call `onStateChanged` when event fires.
         * Use `propertyNames` param in injected script for explicitly stating which props
         * have changed
         */
        listenPage() {
            this.onStateChanged();
            window.addEventListener('message', ({data}) => {
                if (data.sender !== 'wmc-page-notifier') return;

                this.onStateChanged(data.propertyNames);
            });
        }

        /**
         * Inject a script from the specified URL directly into page. Use it for getting info from
         * page objects or calling its' control methods
         * @param {string} url - URL of the script. Should be mentioned in web_accessible_resources manifest entry
         * @returns a Promise fullfilled when script is loaded. Use it for injecting scripts in right order
         */
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

        /**
         * A `document.querySelector` replacement with some batteries. Waits while there is at least one Node
         * which matches the selector and then resolves with this Node. Note that it uses MutationObserver on
         * the whole DOM, so making it wait long could be expensive
         * @param {string} selector - A valid CSS selector
         * @returns a Promise fullfilled with the first matching Node
         */
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

        /**
         * Calls `onStateChanged` when the `element` and/or its underlying subtree generates mutations.
         * Note that it's not suitable for watching events generated by those elements
         * @param {Node} element - The obseved element
         */
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

        /**
         * Start media playback if not yet. It's intended to be overriden.
         * At least one of [play, pause] or playPause should be overriden, otherwise its'
         * calls would cause an infinite loop!
         */
        play() {
            Promise.resolve(this.playbackStatus).then(status => {
                if (status !== 'playing') {
                    this.playPause();
                }
            });
        }

        /**
         * Pause media playback if not yet. It's intended to be overriden.
         * At least one of [play, pause] or playPause should be overriden, otherwise its'
         * calls would cause an infinite loop!
         */
        pause() {
            Promise.resolve(this.playbackStatus).then(status => {
                if (status === 'playing') {
                    this.playPause();
                }
            });
        }

        /**
         * Toggle media playback. It's intended to be overriden.
         * At least one of [play, pause] or playPause should be overriden, otherwise its'
         * calls would cause an infinite loop!
         */
        playPause() {
            Promise.resolve(this.playbackStatus).then(status => {
                if (status === 'playing') {
                    this.pause();
                } else {
                    this.play();
                }
            });
        }

        /**
         * Stop media playback. It's intended to be overriden.
         * When this method has no effect, `canStop` property should be false
         */
        stop() {}

        /**
         * Go to the previous track. It's intended to be overriden.
         * When this method has no effect, `canGoPrevious` property should be false
         */
        previous() {}

        /**
         * Go to the next track. It's intended to be overriden.
         * When this method has no effect, `canGoNext` property should be false
         */
        next() {}


        /**
         * Seek for the given offset. Negative value means seek backwards.
         * @param {Number} offset - Offset in milliseconds
         */
        seek() {}


        /**
         * Internal method for setting position. Doesn't perform anything if
         * given trackId does not match current one. If you want to override
         * this behaviour, you should return `null` from `get uniqueId()` instead
         * @param {string} trackId - ID of the track which was playing in the beginning of the action
         * @param {Number} position - Position in the song in milliseconds. Should be in [0; length]
         */
        set position({ trackId, position }) {
            Promise.resolve(this.trackId).then(curTrackId => {
                if (trackId !== curTrackId) return;
                this.currentTime = position;
            });
        }

        /**
         * Set position for the media playback. It's intended to be overriden
         * @param {Number} currentTime - Position in the song in milliseconds. Should be in [0; length]
         */
        set currentTime(currentTime) {}


        /**
         * Set player volume. It's intended to be overriden
         * @param {Number} volume - New volume. Should be in [0; 1]
         */
        set volume(volume) {}

        /**
         * Get current playback status. It *must* be overriden for proper work.
         * @returns {string} Playback status or Promise which fullfills with it.
         * Should be one of 'playing', 'paused' or 'stopped'
         */
        get playbackStatus() {}


        /**
         * Get current position. It's intended to be overriden.
         * @returns {Number} Position or Promise which fullfills with it.
         * Should be in [0; length]
         */
        get currentTime() {}


        /**
         * Get current volume.
         * @returns {Number} Position or Promise which fullfills with it.
         * Should be in [0; 1]
         */
        get volume() {}

        /**
         * Get current control abilities. Their names are self-documented
         * @returns {object} the abilities or Promise whuch fullfills with it.
         */
        get properties() {
            return {
                canGoNext: true,
                canGoPrevious: true,
                canPlay: true,
                canPause: true,
                canSeek: true,
                canControl: true,
            };
        }

        /**
         * Get length of the current track. Should return null or undefined if
         * it does not make sense (e.g. stream). This method is intended to be overriden.
         * @returns {Number} length in milliseconds
         */
        get length() {}

        /**
         * Get artist(s) of the current track. This method is intended to be overridden.
         * @returns {string|Array[string]} artist or artist list
         */
        get artist() {}


        /**
         * Get album of the current track. This method is intended to be overriden.
         * @returns {string} album
         */
        get album() {}

        /**
         * Get title of the current track. This method is intended to be overriden.
         * @returns {string} title
         */
        get title() {}

        /**
         * Get URL of the album cover. This method is intended to be overriden.
         * @returns {string} URL of the album cover
         */
        get artUrl() {}

        /**
         * Get unique ID of the current track. Should be overridden if we can do that
         * and should be not overriden otherwise
         * @returns {string} ID
         */
        get uniqueId() {}

        /**
         * Append unique ID to the prefix or get to common ID for undefined
         * @returns {string} ID
         */
        get trackId() {
            return Promise.resolve(this.uniqueId).then(uniqueId => {
                if (!uniqueId) {
                    return '/me/f1u77y/web_media_controller/CurrentTrack';
                } else {
                    return `${prefix.get(this)}/${uniqueId}`;
                }
            });
        }

        /**
         * Get track info with other getters. May be overridden if you get info in other
         * way then with the field getters
         * @returns {object} Track Info
         */
        get trackInfo() {
            return Promise.all([
                this.length, this.artist, this.album, this.title, this.artUrl, this.trackId,
            ]).then(([length, artist, album, title, artUrl, trackId]) => {
                return { length, artist, album, title, artUrl, trackId };
            });
        }

        /**
         * Should be called when property `name` was changed for sending this event
         * to background. Should not be overridden and generally should be called only
         * internally
         * @param {function} getter - A getter function for the property
         * @param {string} name - The property name
         */
        onPropertyChanged(getter, name) {
            const throttle = throttleInterval[name];
            if (throttle != null) {
                const now = Date.now();
                if (now - lastCallTime.get(this).get(name) < throttle) return;
                lastCallTime.get(this).set(name, now);
            }

            Promise.resolve(getter).then(curValue => {
                if (!_.isEqual(curValue, lastValue.get(this).get(name))) {
                    lastValue.get(this).set(name, curValue);
                    this.sendProperty(name, curValue);
                }
            });
        }

        /**
         * Should be called when properties `propertyNames` were changed for sending
         * these events to background. Should not be overridden
         * @param {Array[string]} properties - The property names
         */
        onStateChanged(properties = propertyNames) {
            for (let name of properties) {
                this.onPropertyChanged(this[name], name);
            }
        }
    }

    return BaseConnector;
})();
