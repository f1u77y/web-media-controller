'use strict';

import defaults from 'common/defaults';

export default new class {
    constructor() {
        this.storage = chrome.storage.sync || chrome.storage.local;
    }

    getBatch(...keys) {
        return new Promise((resolve, reject) => {
            let query = {};
            for (let key of keys) {
                query[key] = defaults[key];
            }
            this.storage.get(query, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                } else {
                    resolve(result);;
                }
            });
        });
    }

    async get(key) {
        return (await this.getBatch(key))[key];
    }

    set(items) {
        return new Promise((resolve, reject) => {
            this.storage.set(items, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                } else {
                    resolve();
                }
            });
        });
    }
};
