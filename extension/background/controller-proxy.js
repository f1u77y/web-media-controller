'use strict';

/* global WebSocket */
/* global define */

define(() => {
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

            this.socket = new WebSocket(this.address);
        }

        reconnect() {
            this.socket = new WebSocket(this.address);
            for (let messageListener of this.toMessageListener.values()) {
                this.socket.addEventListener('message', messageListener);
            }
        }

        sendCommand(command, arg = null) {
            let line = command.toUpperCase();
            if (arg) {
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
