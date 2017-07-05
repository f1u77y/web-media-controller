'use strict';

define([
    'common/defaults',
], (defaults) => {
    return new class {
        constructor() {
            this.storage = chrome.storage.sync || chrome.storage.local;
        }

        get(keys) {
            return new Promise((resolve, reject) => {
                let query = {};
                if (Array.isArray(keys)) {
                    for (let key of keys) {
                        query[key] = defaults[key];
                    }
                } else {
                    query[keys] = defaults[keys];
                }
                this.storage.get(query, (items) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError.message);
                    } else {
                        resolve(items);
                    }
                });
            });
        }

        getBool(key) {
            return new Promise((resolve) => {
                this.get(key).then(response => {
                    if (response[key]) {
                        resolve();
                    }
                });
            });
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
});
