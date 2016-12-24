'use strict';

/* global WebSocket */
/* global define */

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

            this.reconnect();
            chrome.browserAction.setTitle({title: 'Reconnect'});
            chrome.browserAction.onClicked.addListener(this.reconnect.bind(this));
        }

        setDisconnected() {
            chrome.browserAction.setIcon({
                path: {
                    '16': 'icons/disconnect-16.png',
                    '32': 'icons/disconnect-32.png',
                    '64': 'icons/disconnect-64.png',
                    '128': 'icons/disconnect-128.png',
                }
            });
        }

        setConnected() {
            chrome.browserAction.setIcon({
                path: {
                    '16': 'icons/playing-16.png',
                    '32': 'icons/playing-32.png',
                    '64': 'icons/playing-64.png',
                    '128': 'icons/playing-128.png',
                }
            });
        }

        reconnect() {
            if (this.socket) {
                this.socket.close();
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

        sendCommand(command, arg = null) {
            let line = command;
            if (arg !== null) {
                line = `${line} ${JSON.stringify(arg)}`;
            }
            this.socket.send(line);
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
