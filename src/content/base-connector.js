import MetadataFilter from 'content/filter';
import Utils from 'content/utils';
import _ from 'underscore';
import browser from 'webextension-polyfill';

const $ = Utils.$;

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
        this.playerSelector = null;
        this.scriptsToInject = null;

        this.pageGetters = new Set();
        this.pageSetters = new Set();
        this.pageActions = new Set();
        this.dataFromPage = new Map();

        this.metadataFilter = new MetadataFilter({});

        this.isInjectedScriptEmittingChanges = false;

        this._displayedWarnings = new Set();
        this._pageGetterIDs = new Map();
        this._lastPropertyValue = new Map([[ 'playbackStatus', 'stopped' ]]);
        this._lastGetterCallTime = new Map();
        this.prefix = null;

        this._port = browser.runtime.connect();
    }

    async listenBackgroundEvents() {
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
                for (const name of PROPERTY_NAMES) {
                    if (this._lastPropertyValue.has(name)) {
                        this.sendProperty(name, this._lastPropertyValue.get(name));
                    }
                }
                this.sendProperty('name', this.name);
                break;
            case 'ping':
                this._port.postMessage('pong');
            }
        });

        browser.runtime.onMessage.addListener(async (message) => {
            if (message === 'ping') {
                return 'pong';
            }
            return null;
        });
    }

    async listenPlayerEvents() {
        if (this.scriptsToInject != null) {
            await this.injectScripts(this.scriptsToInject);
        }
        this.onStateChanged();
        if (this.playerSelector != null) {
            const player = $(this.playerSelector);
            console.log('found player element:');
            console.log(player);
            this.observe(player);
        } else if (this.mediaSelector != null) {
            const media = $(this.mediaSelector);
            media.addEventListener('timeupdate', () => this.onStateChanged(['currentTime']));
            media.addEventListener('play', () => this.onStateChanged(['playbackStatus']));
            media.addEventListener('pause', () => this.onStateChanged(['playbackStatus']));
            media.addEventListener('volumechange', () => this.onStateChanged(['volume']));
            media.addEventListener('loadedmetadata', () => this.onStateChanged(['trackInfo']));
        } else if (this.isInjectedScriptEmittingChanges) {
            this.listenPage();
        } else {
            this.singleWarn("WMC: we don't listen changes in any way in start()");
        }
    }

    start() {
        this.listenBackgroundEvents();
        this.listenPlayerEvents();
    }

    /**
     * Send updated property to the background. Intended for internal usage
     * @param {string} name - Property name
     * @param {object} value - New property value
     */
    sendProperty(name, value) {
        const message = { name, value };
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
     * Send a command to injected script
     * @param {string} command - Command name
     * @param {object} [argument=null] - Single argument. Must be JSON-ifiable
     */
    sendToPage(command, argument = null) {
        window.postMessage({
            sender: 'wmc-connector',
            type: 'command',
            command,
            argument,
        }, '*');
    }

    /**
     * Set a property using injected script
     * @param {string} property - Property name
     * @param {object} [argument=null] - Single argument. Must be JSON-ifiable
     */
    setOnPage(property, value) {
        window.postMessage({
            sender: 'wmc-connector',
            type: 'setter',
            property,
            value,
        }, '*');
    }

    triggerPageUpdate(propertyNames = PROPERTY_NAMES) {
        window.postMessage({
            sender: 'wmc-connector',
            type: 'update-properties',
            propertyNames,
        }, '*');
    }

    /**
     * Listen events from injected script and call `onStateChanged` when event fires.
     * Use `propertyNames` param in injected script for explicitly stating which
     * properties have changed
     */
    listenPage() {
        this.triggerPageUpdate();
        window.addEventListener('message', ({ data }) => {
            if (data.sender !== 'wmc-page') return;
            if (data.type !== 'update-notifier') return;
            for (const propName of Object.keys(data.changedProperties)) {
                this.dataFromPage.set(propName, data.changedProperties[propName]);
            }
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
    injectScripts(urls) {
        return new Promise((resolve) => {
            /* eslint no-loop-func: "off" */
            // This function inside a loop is **intended** to change `injectedNumber`
            let injectedNumber = 0;
            for (const url of urls) {
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
    play() {
        if (this.pageActions.has('play')) {
            this.sendToPage('play');
        } else if (this.mediaSelector) {
            const media = $(this.mediaSelector);
            if (!media) {
                return;
            }
            media.play();
        } else {
            if (this.playbackStatus !== 'playing') {
                this.playPause();
            }
        }
    }

    /**
     * Pause media playback if not yet. It's intended to be overriden.
     */
    pause() {
        if (this.pageActions.has('pause')) {
            this.sendToPage('pause');
        } else if (this.mediaSelector) {
            const media = $(this.mediaSelector);
            if (!media) {
                return;
            }
            media.pause();
        } else {
            if (this.playbackStatus === 'playing') {
                this.playPause();
            }
        }
    }

    /**
     * Toggle media playback. It's intended to be overriden.
     */
    playPause() {
        if (this.pageActions.has('playPause')) {
            this.sendToPage('playPause');
        } else if (this.playButtonSelector) {
            const playButton = $(this.playButtonSelector);
            if (!playButton) {
                return;
            }
            playButton.click();
        } else {
            if (this.playbackStatus === 'playing') {
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
            const stopButton = $(this.stopButtonSelector);
            if (!stopButton) {
                return;
            }
            stopButton.click();
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
            const prevButton = $(this.prevButtonSelector);
            if (!prevButton) {
                return;
            }
            prevButton.click();
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
            const nextButton = $(this.nextButtonSelector);
            if (!nextButton) {
                return;
            }
            nextButton.click();
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
            const media = $(this.mediaSelector);
            if (!media) {
                return;
            }
            media.currentTime += offset / 1000;
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
        if (trackId !== this.trackId) return;
        this.currentTime = position;
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
            const media = $(this.mediaSelector);
            if (!media) {
                return;
            }
            media.currentTime = currentTime / 1000;
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
            const media = $(this.mediaSelector);
            if (!media) {
                return;
            }
            $(this.mediaSelector).volume = volume;
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
            return this.dataFromPage.get('playbackStatus');
        } else if (this.mediaSelector) {
            const media = $(this.mediaSelector);
            if (!media) {
                return;
            }
            return media.paused ? 'paused' : 'playing';
        } else {
            this.singleWarn('Connector.get playbackStatus not implemented');
            return undefined;
        }
    }


    /**
     * Get current position in milliseconds. It's intended to be overriden.
     * @returns {Promise} fullfilled with position
     * Should be in [0; length]
     */
    get currentTime() {
        if (this.pageGetters.has('currentTime')) {
            return this.dataFromPage.get('currentTime');
        } else if (this.currentTimeSelector) {
            const currentTimeNode = $(this.currentTimeSelector);
            if (!currentTimeNode) {
                return;
            }
            const text = currentTimeNode.textContent;
            return Math.floor(Utils.parseCurrentTime(text, { useFirstValue: true }) * 1000);
        } else if (this.progressSelector) {
            const progressNode = $(this.progressSelector);
            if (!progressNode) {
                return undefined;
            }
            if (progressNode.hasAttribute('aria-valuenow')) {
                const progressValueNow = progressNode.getAttribute('aria-valuenow');
                return Math.floor(parseFloat(progressValueNow) * this.timeCoefficient);
            } else {
                const text = progressNode.textContent;
                return Math.floor(Utils.parseCurrentTime(text) * 1000);
            }
        } else if (this.mediaSelector) {
            // HTMLMediaElement.currentTime is always in seconds
            const media = $(this.mediaSelector);
            if (!media) {
                return undefined;
            }
            return Math.floor(media.currentTime * 1000);
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
            return this.dataFromPage.get('volume');
        } else if (this.volumeSelector) {
            const volumeNode = $(this.volumeSelector);
            if (!volumeNode) {
                return undefined;
            }
            const volumeAbs = parseFloat(volumeNode.getAttribute('aria-valuenow'));
            const volumeMax = parseFloat(volumeNode.getAttribute('aria-valuemax'));
            return volumeAbs / volumeMax;
        } else if (this.mediaSelector) {
            const media = $(this.mediaSelector);
            if (!media) {
                return undefined;
            }
            return media.volume;
        } else {
            this.singleWarn('Connector.get volume not implemented');
            return undefined;
        }
    }

    /**
     * Get current control abilities. Their names are self-documented
     * @returns {Promise} which fullfills with the object.
     */
    get controlsInfo() {
        return {
            canGoNext: true,
            canGoPrevious: true,
            canPlay: true,
            canPause: true,
            canSeek: true,
        };
    }

    /**
     * Get length of the current track. Should return undefined if
     * it does not make sense (e.g. stream). This method is intended to be overriden.
     * @returns {Number} length in milliseconds
     */
    get length() {
        if (this.pageGetters.has('length')) {
            return this.dataFromPage.get('length');
        } else if (this.lengthSelector) {
            const lengthNode = $(this.lengthSelector);
            if (!lengthNode) {
                return undefined;
            }
            return Utils.parseLength(lengthNode.textContent, { useFirstValue: true }) * 1000;
        } else if (this.progressSelector) {
            const progressNode = $(this.progressSelector);
            if (!progressNode) {
                return undefined;
            }
            if (progressNode.hasAttribute('aria-valuemax')) {
                let result = progressNode.getAttribute('aria-valuemax');
                result = parseFloat(result);
                result *= this.timeCoefficient || 1;
                return result;
            } else {
                const text = progressNode.textContent;
                return Utils.parseLength(text) * 1000;
            }
        } else if (this.mediaSelector) {
            // HTMLMediaElement.duration is always in seconds
            const media = $(this.mediaSelector);
            if (!media) {
                return undefined;
            }
            return media.duration * 1000;
        } else {
            this.singleWarn('Connector.get length not implemented');
            return undefined;
        }
    }

    /**
     * Get artist(s) of the current track. This method is intended to be overridden.
     * @returns {Promise} fullfilled with artist or Array of artists
     */
    get artist() {
        if (this.pageGetters.has('artist')) {
            return this.dataFromPage.get('artist');
        } else if (this.artistsSelector) {
            const artists = [];
            for (const node of document.querySelectorAll(this.artistsSelector)) {
                artists.push(node.textContent.trim());
            }
            return artists;
        } else if (this.artistSelector) {
            const elem = $(this.artistSelector);
            if (!elem) {
                return undefined;
            }
            return elem.textContent.trim();
        } else {
            this.singleWarn('Connector.get artist not implemented');
            return undefined;
        }
    }


    /**
     * Get album of the current track. This method is intended to be overriden.
     * @returns {Promise} fullfilled with album
     */
    get album() {
        if (this.pageGetters.has('album')) {
            return this.dataFromPage.get('album');
        } else if (this.albumSelector) {
            const elem = $(this.albumSelector);
            if (!elem) {
                return undefined;
            }
            return elem.textContent;
        } else {
            this.singleWarn('Connector.get album not implemented');
            return undefined;
        }
    }

    /**
     * Get title of the current track. This method is intended to be overriden.
     * @returns {Promise} fullfilled title
     */
    get title() {
        if (this.pageGetters.has('title')) {
            return this.dataFromPage.get('title');
        } else if (this.titleSelector) {
            const elem = $(this.titleSelector);
            if (!elem) {
                return undefined;
            }
            return elem.textContent.trim();
        } else {
            this.singleWarn('Connector.get title not implemented');
            return undefined;
        }
    }

    /**
     * Get URL of the album cover. This method is intended to be overriden.
     * @returns {Promise} fullfilled with URL of the album cover
     */
    get artUrl() {
        if (this.pageGetters.has('artUrl')) {
            return this.dataFromPage.get('artUrl');
        } else if (this.artSelector) {
            const artNode = $(this.artSelector);
            if (!artNode) {
                return undefined;
            }
            if (artNode.src) {
                return artNode.src;
            }
            return Utils.extractUrlFromCssProperty(
                artNode.style.backgroundImage || artNode.style.background,
            );
        } else {
            this.singleWarn('Connector.get artUrl not implemented');
            return undefined;
        }
    }

    /**
     * Get unique ID of the current track. Should be overridden if we can do that
     * and should be not overriden otherwise
     * @returns {} ID
     */
    get uniqueId() {
        if (this.pageGetters.has('uniqueId')) {
            return this.dataFromPage.get('uniqueId');
        } else {
            this.singleWarn('Connector.get uniqueId not implemented');
            return undefined;
        }
    }

    /**
     * Append unique ID to the prefix or get to common ID for undefined
     * @returns {Promise} fullfilled with track ID
     */
    get trackId() {
        const uniqueId = this.uniqueId;
        if (uniqueId) {
            return `${COMMON_PREFIX}${this.prefix}/${uniqueId}`;
        } else {
            return '/me/f1u77y/web_media_controller/CurrentTrack';
        }
    }

    /**
     * Get track info with other getters. May be overridden if you get info in other
     * way then with the field getters
     * @returns {Object} Track Info
     */
    get trackInfo() {
        return {
            length: this.length,
            artist: this.artist,
            album: this.album,
            title: this.title,
            artUrl: this.artUrl,
            trackId: this.trackId,
        };
    }

    /**
     * Should be called when property `name` was changed for sending this event
     * to background. Should not be overridden and generally should be called only
     * internally
     * @param {string} name - The property name
     */
    onPropertyChanged(name) {
        const throttleInterval = THROTTLE_INTERVALS[name];
        if (throttleInterval != null) {
            const now = Date.now();
            if (now - this._lastGetterCallTime.get(name) < throttleInterval) return;
            this._lastGetterCallTime.set(name, now);
        }

        const curValue = this[name];

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
        for (const name of properties) {
            this.onPropertyChanged(name);
        }
    }
}

export default BaseConnector;
