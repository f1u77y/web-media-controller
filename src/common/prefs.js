import browser from 'webextension-polyfill';
import defaults from 'common/defaults';

export default new class {
    constructor() {
        this.storage = browser.storage.sync;
    }

    async getBatch(...keys) {
        const query = {};
        for (const key of keys) {
            query[key] = defaults[key] === undefined ? null : defaults[key];
        }
        try {
            return await this.storage.get(query);
        } catch (e) {
            return query;
        }
    }

    async get(key) {
        return (await this.getBatch(key))[key];
    }

    set(items) {
        return this.storage.set(items);
    }
}();
