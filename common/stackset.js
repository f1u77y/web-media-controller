'use strict';

class StackSet {
    constructor(defaultTopValue = null) {
        this._stack = [];
    }

    erase(elem) {
        this._stack = this._stack.filter(x => x !== elem);
    }

    top({ def = null } = {}) {
        if (this.isEmpty()) {
            return def;
        }
        return this._stack[this._stack.length - 1];
    }

    pop({ def = null } = {}) {
        if (this.isEmpty()) {
            return def;
        }
        return this._stack.pop();
    }

    push(elem, { force = true } = {}) {
        if (force) {
            this.erase(elem);
            this._stack.push(elem);
        } else {
            if (!this._stack.include(elem)) {
                this._stack.push(elem);
            }
        }
    }

    isEmpty() {
        return this._stack.length === 0;
    }
}

export default StackSet;
