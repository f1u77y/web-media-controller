'use strict';

import ListenerManager from 'background/listener-manager';

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
    connect() {
        return new Promise(resolve => {
            this.port = chrome.runtime.connectNative('me.f1u77y.web_media_controller');
            this.port.onMessage.addListener((message) => {
                this.onMessage.call(message);
            });

            resolve(this);
        });
    }

    sendMessage(message) {
        this.port.postMessage(message);
    }
};
