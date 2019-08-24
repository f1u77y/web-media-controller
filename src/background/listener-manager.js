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
        for (const listener of this.listeners) {
            listener(...args);
        }
    }
}
