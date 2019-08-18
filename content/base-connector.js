'use strict';

import Utils from 'content/utils';
import MetadataFilter from 'content/filter';
import _ from 'underscore';
import browser from 'webextension-polyfill';

const PROPERTY_NAMES = [
    'controlsInfo',
    'playbackStatus',
    'trackInfo',
    'volume',
    'currentTime',
];
const THROTTLE_INTERVALS = { currentTime: 2000 };
const COMMON_PREFIX = '/me/f1u77y/web_media_controller';

class BaseConnector {
    /**
     * @constructor
     * Initializes base for all connectors
     */
    constructor() {
        this.name = 'Web Media Controller';

        this.playButtonSelector = null;
        this.stopButtonSelector = null;
        this.prevButtonSelector = null;
        this.nextButtonSelector = null;
        this.artistSelector = null;
        this.artistsSelector = null;
        this.albumSelector = null;
        this.titleSelector = null;
        this.artSelector = null;
        this.progressSelector = null;
        this.currentTimeSelector = null;
        this.lengthSelector = null;
        this.volumeSelector = null;
        this.mediaSelector = null;

        this.pageGetters = new Set();
        this.pageSetters = new Set();
        this.pageActions = new Set();

        this.metadataFilter = new MetadataFilter({});

        this._displayedWarnings = new Set();
        this._pageGetterIDs = new Map();
        this._lastPropertyValue = new Map([
            ['playbackStatus', 'stopped'],
        ]);
        this._lastGetterCallTime = new Map();
        this.prefix = null;

        this._port = browser.runtime.connect();
        this._port.onMessage.addListener((message) => {
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
                for (let name of PROPERTY_NAMES) {
                    if (this._lastPropertyValue.has(name)) {
                        this.sendProperty(name, this._lastPropertyValue.get(name));
                    }
                }
                this.sendProperty('name', this.name);
                break;
            case 'ping':
                this._port.postMessage('pong');
            }

            return false;
        });
    }

    /**
     * Send updated property to the background. Intended for internal usage
     * @param {string} name - Property name
     * @param {object} value - New property value
     */
    sendProperty(name, value) {
        let message = { name, value };
        if (message.name === 'trackInfo') {
            message.value = _(this.metadataFilter.filter(message.value)).defaults({
                artist: '',
                album: '',
                title: '',
                url: '',
                length: 0,
                artUrl: '',
                trackId: '',
            });
        }
        this._port.postMessage(message);
    }

    /**
     * Get property from the injected script
     * @param {string} property - Property name
     * @returns {Promise} resolved with fetched value or rejected with timeout
     */
    getFromPage(property) {
        return new Promise((resolve, reject) => {
            const currentId = this._pageGetterIDs.get(property) || 0;
            this._pageGetterIDs.set(property, currentId + 1);
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
     * @param {object} [argument=null] - Single argument. Must be JSON-ifiable
     */
    sendToPage(command, argument = null) {
        window.postMessage({
            sender: 'wmc-connector-command',
            command,
            argument,
        }, '*');
    }

    /**
     * Set a property using injected script
     * @param {string} property - Property name
     * @param {object} [argument=null] - Single argument. Must be JSON-ifiable
     */
    setOnPage(property, argument)  {{
        window.postMessage({
            sender: 'wmc-connector-setter',
            property,
            argument,
        }, '*');
    }}

    /**
     * Listen events from injected script and call `onStateChanged` when event fires.
     * Use `propertyNames` param in injected script for explicitly stating which
     * properties have changed
     */
    listenPage() {
        this.onStateChanged();
        window.addEventListener('message', ({data}) => {
            if (data.sender !== 'wmc-page-notifier') return;
            this.onStateChanged(data.propertyNames);
        });
    }

    /**
     * Inject scripts from the specified URLs directly into page. Use it for getting
     * info from page objects or calling its' control methods
     * @param {string} urls - URLs of the scripts. Should be mentioned in
     * web_accessible_resources manifest entry
     * @returns {Promise} fullfilled when scripts is loaded. Use it for listening
     * for page only when scripts are injected
     */
    injectScripts(...urls) {
        return new Promise((resolve) => {
            let injectedNumber = 0;
            for (let url of urls) {
                const script = document.createElement('script');
                script.src = browser.extension.getURL(url);
                script.addEventListener('load', () => {
                    ++injectedNumber;
                    if (injectedNumber === urls.length) {
                        resolve();
                    }
                });
                (document.head || document.documentElement).appendChild(script);
            }
        });
    }

    /**
     * Calls `onStateChanged` when the `element` and/or its underlying subtree
     * generates mutations.
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

    singleWarn(message) {
        if (!this._displayedWarnings.has(message)) {
            this._displayedWarnings.add(message);
            console.warn(message);
        }
    }

    /**
     * Start media playback if not yet. It's intended to be overriden.
     */
    async play() {
        if (this.pageActions.has('play')) {
            this.sendToPage('play');
        } else if (this.mediaSelector) {
            const mediaElement = await Utils.query(this.mediaSelector);
            mediaElement.play();
        } else {
            const playbackStatus = await this.playbackStatus;
            if (playbackStatus !== 'playing') {
                this.playPause();
            }
        }
    }

    /**
     * Pause media playback if not yet. It's intended to be overriden.
     */
    async pause() {
        if (this.pageActions.has('pause')) {
            this.sendToPage('pause');
        } else if (this.mediaSelector) {
            const mediaElement = await Utils.query(this.mediaSelector);
            mediaElement.pause();
        } else {
            const playbackStatus = await this.playbackStatus;
            if (playbackStatus === 'playing') {
                this.playPause();
            }
        }
    }

    /**
     * Toggle media playback. It's intended to be overriden.
     */
    async playPause() {
        if (this.pageActions.has('playPause')) {
            this.sendToPage('playPause');
        } else if (this.playButtonSelector) {
            Utils.queryClick(this.playButtonSelector);
        } else {
            const playbackStatus = await this.playbackStatus;
            if (status === 'playing') {
                this.pause();
            } else {
                this.play();
            }
        }
    }

    /**
     * Stop media playback. It's intended to be overriden.
     * When this method has no effect, `canStop` property should be false
     */
    stop() {
        if (this.pageActions.has('stop')) {
            this.sendToPage('stop');
        } else if (this.stopButtonSelector) {
            Utils.queryClick(this.stopButtonSelector);
        } else {
            this.singleWarn('Connector.stop not implemented');
        }
    }

    /**
     * Go to the previous track. It's intended to be overriden.
     * When this method has no effect, `canGoPrevious` property should be false
     */
    previous() {
        if (this.pageActions.has('previous')) {
            this.sendToPage('previous');
        } else if (this.prevButtonSelector) {
            Utils.queryClick(this.prevButtonSelector);
        } else {
            this.singleWarn('Connector.previous not implemented');
        }
    }

    /**
     * Go to the next track. It's intended to be overriden.
     * When this method has no effect, `canGoNext` property should be false
     */
    next() {
        if (this.pageActions.has('next')) {
            this.sendToPage('next');
        } else if (this.nextButtonSelector) {
            Utils.queryClick(this.nextButtonSelector);
        } else {
            this.singleWarn('Connector.next not implemented');
        }
    }


    /**
     * Seek for the given offset. Negative value means seek backwards.
     * @param {Number} offset - Offset in milliseconds
     */
    seek(offset) {
        if (this.pageActions.has('seek')) {
            this.sendToPage('seek', offset);
        } else if (this.mediaSelector) {
            this.mediaSelector.currentTime += offset / 1000;
        } else {
            this.singleWarn('Connector.seek not implemented');
        }
    }


    /**
     * Internal method for setting position. Doesn't perform anything if
     * given trackId does not match current one. If you want to override
     * this behaviour, you should return `null` from `get uniqueId()` instead
     * @param {string} trackId - ID of the track which was playing in the
     * beginning of the action
     * @param {Number} position - Position in the song in milliseconds.
     * Should be in [0; length]
     */
    set position({ trackId, position }) {
        this.trackId.then(curTrackId => {
            if (trackId !== curTrackId) return;
            this.currentTime = position;
        });
    }

    /**
     * Set position for the media playback. It's intended to be overriden
     * @param {Number} currentTime - Position in the song in milliseconds.
     * Should be in [0; length]
     */
    set currentTime(currentTime) {
        if (this.pageSetters.has('currentTime')) {
            this.setOnPage('currentTime', currentTime);
        } else if (this.mediaSelector) {
            Utils.query(this.mediaSelector)
                .then(media => media.currentTime = currentTime / 1000);
        } else {
            this.singleWarn('Connector.set currentTime not implemented');
        }
    }


    /**
     * Set player volume. It's intended to be overriden
     * @param {Number} volume - New volume. Should be in [0; 1]
     */
    set volume(volume) {
        if (this.pageSetters.has('volume')) {
            this.setOnPage('volume', volume);
        } else if (this.mediaSelector) {
            Utils.query(this.mediaSelector)
                .then(media => media.volume = volume);
        } else {
            this.singleWarn('Connector.set volume not implemented');
        }
    }

    /**
     * Get current playback status. It *must* be overriden for proper work.
     * @returns {Promise} fullfilled with playback status
     * Should be one of 'playing', 'paused' or 'stopped'
     */
    get playbackStatus() {
        if (this.pageGetters.has('playbackStatus')) {
            return this.getFromPage('playbackStatus');
        } else if (this.mediaSelector) {
            return Utils.query(this.mediaSelector)
                .then(media => media.paused ? 'paused' : 'playing');
        } else {
            this.singleWarn('Connector.get playbackStatus not implemented');
            return Promise.resolve(undefined);
        }
    }


    /**
     * Get current position in milliseconds. It's intended to be overriden.
     * @returns {Promise} fullfilled with position
     * Should be in [0; length]
     */
    get currentTime() {
        if (this.pageGetters.has('currentTime')) {
            return this.getFromPage('currentTime');
        } else if (this.currentTimeSelector) {
            return Utils.query(this.currentTimeSelector).then(node => {
                let text = node.textContent;
                return Math.floor(Utils.parseCurrentTime(text, { useFirstValue: true }) * 1000);
            });
        } else if (this.progressSelector) {
            return Utils.query(this.progressSelector).then(node => {
                if (node.hasAttribute('aria-valuenow')) {
                    let result = node.getAttribute('aria-valuenow');
                    result = parseFloat(result);
                    result *= (this.timeCoefficient || 1);
                    return Math.floor(result);
                } else {
                    let text = node.textContent;
                    return Math.floor(Utils.parseCurrentTime(text) * 1000);
                }
            });
        } else if (this.mediaSelector) {
            // HTMLMediaElement.currentTime is always in seconds
            return Utils.query(this.mediaSelector)
                .then(node => Math.floor(node.currentTime * 1000));
        } else {
            this.singleWarn('Connector.get currentTime not implemented');
            return undefined;
        }
    }


    /**
     * Get current volume.
     * @returns {Promise} which fullfills with current volume
     * Should be in [0; 1]
     */
    get volume() {
        if (this.pageGetters.has('volume')) {
            return this.getFromPage('volume');
        } else if (this.volumeSelector) {
            return Utils.query(this.volumeSelector).then(node => {
                let result = node.getAttribute('aria-valuenow');
                result = parseFloat(result);
                let max = node.getAttribute('aria-valuemax');
                max = parseFloat(max);
                return result / max;
            });
        } else if (this.mediaSelector) {
            return Utils.query(this.mediaSelector)
                .then(media => media.volume);
        } else {
            this.singleWarn('Connector.get volume not implemented');
            return Promise.resolve(undefined);
        }
    }

    /**
     * Get current control abilities. Their names are self-documented
     * @returns {Promise} which fullfills with the object.
     */
    get controlsInfo() {
        return Promise.resolve({
            canGoNext: true,
            canGoPrevious: true,
            canPlay: true,
            canPause: true,
            canSeek: true,
        });
    }

    /**
     * Get length of the current track. Should return undefined if
     * it does not make sense (e.g. stream). This method is intended to be overriden.
     * @returns {Number} length in milliseconds
     */
    get length() {
        if (this.pageGetters.has('length')) {
            return this.getFromPage('length');
        } else if (this.lengthSelector) {
            return Utils.query(this.lengthSelector).then(node => {
                let text = node.textContent;
                return Utils.parseLength(text, { useFirstValue: true }) * 1000;
            });
        } else if (this.progressSelector) {
            return Utils.query(this.progressSelector).then(node => {
                if (node.hasAttribute('aria-valuemax')) {
                    let result = node.getAttribute('aria-valuemax');
                    result = parseFloat(result);
                    result *= (this.timeCoefficient || 1);
                    return result;
                } else {
                    let text = node.textContent;
                    return Utils.parseLength(text) * 1000;
                }
            });
        } else if (this.mediaSelector) {
            // HTMLMediaElement.duration is always in seconds
            return Utils.query(this.mediaSelector)
                .then(node => node.duration * 1000);
        } else {
            this.singleWarn('Connector.get length not implemented');
            return Promise.resolve(undefined);
        }
    }

    /**
     * Get artist(s) of the current track. This method is intended to be overridden.
     * @returns {Promise} fullfilled with artist or Array of artists
     */
    get artist() {
        if (this.pageGetters.has('artist')) {
            return this.getFromPage('artist');
        } else if (this.artistsSelector) {
            let artists = [];
            for (let node of document.querySelectorAll(this.artistsSelector)) {
                artists.push(node.textContent.trim());
            }
            return Promise.resolve(artists);
        } else if (this.artistSelector) {
            return Utils.query(this.artistSelector)
                .then(node => node.textContent.trim());
        } else {
            this.singleWarn('Connector.get artist not implemented');
            return Promise.resolve(undefined);
        }
    }


    /**
     * Get album of the current track. This method is intended to be overriden.
     * @returns {Promise} fullfilled with album
     */
    get album() {
        if (this.pageGetters.has('album')) {
            return this.getFromPage('album');
        } else if (this.albumSelector) {
            return Utils.query(this.albumSelector)
                .then(node => node.textContent);
        } else {
            this.singleWarn('Connector.get album not implemented');
            return Promise.resolve(undefined);
        }
    }

    /**
     * Get title of the current track. This method is intended to be overriden.
     * @returns {Promise} fullfilled title
     */
    get title() {
        if (this.pageGetters.has('title')) {
            return this.getFromPage('title');
        } else if (this.titleSelector) {
            return Utils.query(this.titleSelector)
                .then(node => node.textContent.trim());
        } else {
            this.singleWarn('Connector.get title not implemented');
            return Promise.resolve(undefined);
        }
    }

    /**
     * Get URL of the album cover. This method is intended to be overriden.
     * @returns {Promise} fullfilled with URL of the album cover
     */
    get artUrl() {
        if (this.pageGetters.has('artUrl')) {
            return this.getFromPage('artUrl');
        } else if (this.artSelector) {
            return Utils.query(this.artSelector).then(node => {
                if (node.src) {
                    return node.src;
                }

                return Utils.extractUrlFromCssProperty(
                    node.style.backgroundImage || node.style.background
                );
            });
        } else {
            this.singleWarn('Connector.get artUrl not implemented');
            return Promise.resolve(undefined);
        }
    }

    /**
     * Get unique ID of the current track. Should be overridden if we can do that
     * and should be not overriden otherwise
     * @returns {} ID
     */
    get uniqueId() {
        if (this.pageGetters.has('uniqueId')) {
            return this.getFromPage('uniqueId');
        } else {
            this.singleWarn('Connector.get uniqueId not implemented');
            return Promise.resolve(undefined);
        }
    }

    /**
     * Append unique ID to the prefix or get to common ID for undefined
     * @returns {Promise} fullfilled with track ID
     */
    get trackId() {
        return this.uniqueId.then(uniqueId => {
            if (!uniqueId) {
                return '/me/f1u77y/web_media_controller/CurrentTrack';
            } else {
                return `${COMMON_PREFIX}${this.prefix}/${uniqueId}`;
            }
        });
    }

    /**
     * Get track info with other getters. May be overridden if you get info in other
     * way then with the field getters
     * @returns {Object} Track Info
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
     * @param {Function} getter - A getter function for the property
     * @param {string} name - The property name
     */
    async onPropertyChanged(getter, name) {
        const throttleInterval = THROTTLE_INTERVALS[name];
        if (throttleInterval != null) {
            const now = Date.now();
            if (now - this._lastGetterCallTime.get(name) < throttleInterval) return;
            this._lastGetterCallTime.set(name, now);
        }

        const curValue = await getter;
        if (!_.isEqual(curValue, this._lastPropertyValue.get(name))) {
            this._lastPropertyValue.set(name, curValue);
            this.sendProperty(name, curValue);
        }
    }

    /**
     * Should be called when properties `propertyNames` were changed for sending
     * these events to background. Should not be overridden
     * @param {Array[string]} properties - The property names
     */
    onStateChanged(properties = PROPERTY_NAMES) {
        for (let name of properties) {
            this.onPropertyChanged(this[name], name);
        }
    }
}

export default BaseConnector;
