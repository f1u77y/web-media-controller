'use strict';

export default class ListenerManager {
    constructor() {
        this.listeners = new Set();
    }

    addListener(listener) {
        this.listeners.add(listener);
    }

    removeListener(listener) {
        this.listeners.remove(listener);
    }

    call(...args) {
        for (let listener of this.listeners) {
            listener(...args);
        }
    }
}
