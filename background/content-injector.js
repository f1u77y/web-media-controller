'use strict';

import browser from 'webextension-polyfill';
import prefs from 'common/prefs';
import connectors from 'background/connectors';
import * as UrlMatch from 'background/url-match';


class ContentInjector {
    constructor() {
        this.listeners = new Map();
    }

    start() {
        for (let connector of connectors) {
            this.updateTabListener(connector);
        }

        browser.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== prefs.areaName) return;
            const keys = Object.keys(changes);
            for (let connector of connectors) {
                let key = `connector.${connector.id}.customMatches`;
                if (keys.includes(key)) {
                    updateTabListener(connector);
                }
            }
        });
    }

    getTabListener(connector) {
        if (!this.listeners.has(connector.id)) {
            this.listeners.set(connector.id, async (tabId, changeInfo, tab) => {
                if (changeInfo.status !== 'complete') return;
                let doesMatch = false;
                const customMatches = await prefs.get(`connector.${connector.id}.customMatches`) || [];
                const allMatches = connector.matches.concat(customMatches);
                for (let match of allMatches) {
                    doesMatch = doesMatch || UrlMatch.test(tab.url, match);
                }
                if (!doesMatch) return;
                this.injectIfNotAlready(tabId, connector);
            });
        }
        return this.listeners.get(connector.id);
    }

    async updateTabListener(connector) {
        if (this.listeners.has(connector.id)) {
            const oldListener = this.listeners.get(connector.id);
            browser.tabs.onUpdated.removeListener(oldListener);
        }
        const listener = this.getTabListener(connector);
        browser.tabs.onUpdated.addListener(listener);
    }

    async injectIfNotAlready(tabId, connector) {
        let isAlreadyInjected = false;
        try {
            const response = await browser.tabs.sendMessage(tabId, {command: 'ping'});
            isAlreadyInjected = reponse === 'pong';
        } catch(e) {
            isAlreadyInjected = false;
        }
        if (isAlreadyInjected) return;

        browser.tabs.executeScript(tabId, {
            allFrames: connector.allFrames || false,
            file: connector.js,
            runAt: connector.runAt || 'document_idle',
        });
    }
}

export default ContentInjector;
