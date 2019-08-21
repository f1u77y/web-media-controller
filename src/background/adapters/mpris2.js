'use strict';

import ListenerManager from 'background/listener-manager';
import browser from 'webextension-polyfill';

export default class {
    /**
     * @constructor
     */
    constructor() {
        /**
         * Called when a message from an external application is received.
         * @param {object} message WebMediaController message
         */
        this.onMessage = new ListenerManager();
    }

    /**
     * Connect to application.
     * @returns {Promise} Promise resolved with adapter instance
     * @throws Error if adapter is not initialized
     */
    async connect() {
        this.port = browser.runtime.connectNative('me.f1u77y.web_media_controller');
        this.port.onMessage.addListener((message) => {
            this.onMessage.call(message);
        });
        return this;
    }

    sendMessage(message) {
        this.port.postMessage(message);
    }
}
