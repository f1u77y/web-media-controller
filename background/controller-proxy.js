'use strict';

/* global WebSocket */
/* global define */
/* global chrome */
/* global _ */

define([
    './tab-chooser'
], (chooser) => {
    function parseMessage(message) {
        const space = message.indexOf(' ');
        if (space === -1) {
            return {
                command: message,
                argument: null,
            };
        } else {
            return {
                command: message.substr(0, space),
                argument: message.substr(space + 1),
            };
        }
    }

    class ControllerProxy {
        constructor(address) {
            this.address = address;
            this.listeners = new Set();
            this.toMessageListener = new Map();
            this.reconnectTimerId = null;
            this.reconnectDelay = 1000;

            this.reconnect();
        }

        connected() {
            return Boolean(this.socket) && this.socket.readyState === WebSocket.OPEN;
        }

        tryReconnect() {
            this.reconnectTimerId = setInterval(() => {
                this.reconnect();
            }, this.reconnectDelay);
        }

        setDisconnected() {
            if (this.reconnectTimerId === null) {
                this.tryReconnect();
            }
        }

        setConnected() {
            if (this.reconnectTimerId !== null) {
                clearInterval(this.reconnectTimerId);
                this.reconnectTimerId = null;
            }
        }

        reconnect() {
            if (this.socket) {
                switch (this.socket.readyState) {
                case WebSocket.OPEN:
                case WebSocket.OPENING:
                    this.socket.close();
                    break;
                }
                this.socket = null;
            }
            this.socket = new WebSocket(this.address);
            this.socket.addEventListener('open',  this.setConnected.bind(this));
            this.socket.addEventListener('close', this.setDisconnected.bind(this));
            this.socket.addEventListener('error', this.setDisconnected.bind(this));
            for (let messageListener of this.toMessageListener.values()) {
                this.socket.addEventListener('message', messageListener);
            }
            chooser.sendMessage({
                sender: 'vkpc-proxy',
                command: 'reconnect',
            });
        }

        sendCommand(message) {
            if (!message.hasOwnProperty('command')) {
                return;
            }
            this.socket.send(JSON.stringify(_.defaults(message, { argument: null })));
        }

        onCommand(listener) {
            if (!this.socket) {
                return;
            }

            function messageListener({data}) {
                const {command, argument} = parseMessage(data);
                listener(command, argument);
            }

            this.listeners.add(listener);
            this.toMessageListener.set(listener, messageListener);
            this.socket.addEventListener('message', messageListener);
        }
    }
    return ControllerProxy;
});
