'use strict';

/**
 * Application adapter for Rainmeter WebNowPlaying plugin.
 */

import Utils from 'background/utils';
import ListenerManager from 'background/listener-manager';

const WEBSOCKET_ADDRESS = 'ws://127.0.0.1:8974/';
const RECONNECT_INTERVAL = 5000;

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
    }

    /**
     * Connect to application.
     * @returns {Promise} Promise resolved with adapter instance
     * @throws Error if adapter is not initialized
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.webSocket = new WebSocket(WEBSOCKET_ADDRESS);
            this.webSocket.onmessage = (message) => {
                this.onWebSocketMessage(message);
            };

            this.webSocket.onopen = () => {
                this.webSocket.onopen = null;
                this.webSocket.onclose = () => {
                    setTimeout(() => {
                        this.connect();
                    }, RECONNECT_INTERVAL);
                };

                resolve(this);
            }
            this.webSocket.onerror = () => {
                this.webSocket.onerror = null;
                reject(new Error('Connection is not established'));
            }
        });
    }

    /**
     * Send message to an external application.
     * @param {object} message WebMediaController message
     */
    sendMessage(message) {
        let { name, value } = message;

        if (name === 'trackInfo') {
            let trackInfo = value;
            for (let prop in trackInfo) {
                let rainmeterMsg = messageMap[prop];
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
        let rainmeterCommand = message.data.toLowerCase();
        let command = commandsMap[rainmeterCommand];

        this.onMessage.call({ command });
    }

    /**
     * Send message using WebSocket.
     * @param  {string} name Message name
     * @param  {string} value Message value
     */
    sendMessageViaWebSocket(name, value) {
        // Convert value
        switch (name) {
        case 'playbackStatus': {
            value = playingStateMap[value];
            break;
        }
        case 'artist':
            if (Array.isArray(value)) {
                value = value.join(', ');
            }
            break;
        case 'length':
        case 'currentTime': {
            value = Utils.secondsToMMSS(value / 1000);
            break;
        }
        case 'volume': {
            value = value * 100;
        }
        }

        let rMessage = messageMap[name];
        this.webSocket.send(`${rMessage}:${value}`);
    }
}
