/**
 * Application adapter for Rainmeter WebNowPlaying plugin.
 */

import ListenerManager from 'background/listener-manager';
import Utils from 'background/utils';

const WEBSOCKET_ADDRESS = 'ws://127.0.0.1:8974/';

/**
    * WebMediaController => Rainmeter
    * @type {object}
    */
const messageMap = {
    name: 'PLAYER',
    artist: 'ARTIST',
    title: 'TITLE',
    album: 'ALBUM',
    artUrl: 'COVER',
    playbackStatus: 'STATE',
    currentTime: 'POSITION',
    length: 'DURATION',
    volume: 'VOLUME',
};

/**
    * Rainmeter => WebMediaController
    * @type {object}
    */
const commandsMap = {
    playpause: 'playPause',
    play: 'play',
    pause: 'pause',
    previous: 'previous',
    next: 'next',
};

const playingStateMap = {
    'stopped': 0,
    'playing': 1,
    'paused': 2,
};

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

    isSupported() {
        return new Promise((resolve) => {
            try {
                const ws = new WebSocket(WEBSOCKET_ADDRESS);
                ws.onerror = () => {
                    ws.onerror = null;
                    ws.onopen = null;
                    ws.close();
                    resolve(false);
                };
                ws.onopen = () => {
                    ws.onerror = null;
                    ws.onopen = null;
                    ws.close();
                    resolve(true);
                };
            } catch (e) {
                resolve(false);
            }
        });
    }

    /**
     * Connect to application.
     * @returns {Promise} Promise resolved with adapter instance
     */
    connect() {
        return new Promise((resolve) => {
            this.webSocket = new WebSocket(WEBSOCKET_ADDRESS);
            this.webSocket.onmessage = (message) => {
                this.onWebSocketMessage(message);
            };

            this.webSocket.onopen = () => {
                this.webSocket.onopen = null;
                this.webSocket.onclose = () => {
                    this.onDisconnect.fire(this);
                    this.webSocket.onclose = null;
                };

                resolve(this);
            };
            this.webSocket.onerror = () => {
                this.onDisconnect.fire(this);
                this.webSocket.onerror = null;
            };
        });
    }

    /**
     * Send message to an external application.
     * @param {object} message WebMediaController message
     */
    sendMessage(message) {
        const { name, value } = message;

        if (name === 'trackInfo') {
            const trackInfo = value;
            for (const prop of Object.keys(trackInfo)) {
                const rainmeterMsg = messageMap[prop];
                if (!rainmeterMsg) {
                    continue;
                }

                this.sendMessageViaWebSocket(prop, trackInfo[prop]);
            }
            return;
        }

        this.sendMessageViaWebSocket(name, value);
    }

    /**
     * Internal functions.
     */

    /**
     * Сalled when a message from WebSocket is received.
     * @param {object} message WebSocket message
     */
    onWebSocketMessage(message) {
        const rainmeterCommand = message.data.toLowerCase();
        const command = commandsMap[rainmeterCommand];

        this.onMessage.call({ command });
    }

    /**
     * Send message using WebSocket.
     * @param  {string} name Message name
     * @param  {string} value Message value
     */
    sendMessageViaWebSocket(name, value) {
        let convertedValue = value;

        switch (name) {
        case 'playbackStatus': {
            convertedValue = playingStateMap[value];
            break;
        }
        case 'artist':
            if (Array.isArray(value)) {
                convertedValue = value.join(', ');
            }
            break;
        case 'length':
        case 'currentTime': {
            convertedValue = Utils.secondsToMMSS(value / 1000);
            break;
        }
        case 'volume': {
            convertedValue = value * 100;
            break;
        }
        }

        const rMessage = messageMap[name];
        this.webSocket.send(`${rMessage}:${convertedValue}`);
    }
}
