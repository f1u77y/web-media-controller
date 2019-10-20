import ListenerManager from 'background/listener-manager';
import browser from 'webextension-polyfill';

const EXTERNAL_APP_ID = 'me.f1u77y.web_media_controller';

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
        this.onDisconnect = new ListenerManager();
    }

    async isSupported() {
        try {
            const response = await browser.runtime.sendNativeMessage(EXTERNAL_APP_ID, { name: 'ping', value: null });
            return response === 'pong';
        } catch (e) {
            return false;
        }
    }

    /**
     * Connect to application.
     * @returns {Promise} Promise resolved with adapter instance
     * @throws Error if adapter is not initialized
     */
    async connect() {
        this.port = browser.runtime.connectNative(EXTERNAL_APP_ID);
        this.port.onMessage.addListener((message) => {
            this.onMessage.call(message);
        });
        this.port.onDisconnect.addListener(() => {
            this.onDisconnect.fire(this);
        });
        return this;
    }

    sendMessage(message) {
        this.port.postMessage(message);
    }
}
