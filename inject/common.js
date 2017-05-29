'use strict';

class PageHelper {
    constructor() {
        this.listeners = new Map();
        this.getters = new Map();
    }

    changeProperties(propertyNames) {
        window.postMessage(({ sender: 'wmc-page-notifier', propertyNames }), '*');
    }

    addListener(command, callback, { oneShot = false } = {}) {
        if (this.listeners.has(command)) {
            throw false;
        }

        const listener = ({ data }) => {
            if (data.sender !== 'wmc-connector-command') return;
            if (data.command !== command) return;
            if (oneShot) {
                this.removeListener(command);
            }
            callback(data.argument);
        };

        window.addEventListener('message', listener);
        this.listeners.set(command, listener);
    }

    removeListener(command) {
        if (!this.listeners.has(command)) return;

        window.removeEventListener('message', this.listeners.get(command));
        this.listeners.delete(command);
    }

    addGetter(property, func) {
        if (this.getters.has(property)) {
            throw false;
        }

        const getter = ({data}) => {
            if (data.sender !== 'wmc-connector-getter' || data.property !== property) {
                return;
            }

            Promise.resolve(func())
                .then(value => {
                    window.postMessage({
                        sender: 'wmc-page-getter',
                        property: data.property,
                        id: data.id,
                        response: value,
                    }, '*');
                });
        };

        window.addEventListener('message', getter);
        this.getters.set(property, getter);
    }

    removeGetter(property) {
        if (!this.getters.has(property)) return;

        window.removeEventListener('message', this.getters.get(property));
        this.getters.delete(property);
    }

    canStart() {
        if (window.wlcInjected) {
            return false;
        }
        window.wlcInjected = true;
        return true;
    }
}
