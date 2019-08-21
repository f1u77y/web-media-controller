'use strict';

import browser from 'webextension-polyfill';
import prefs from 'common/prefs';
import connectors from 'background/connectors';
import * as UrlMatch from 'background/url-match';


class ContentInjector {
    start() {
        browser.tabs.onUpdated.addListener((tabID, changeInfo, tab) => {
            this.onTabsUpdatedListener(tabID, changeInfo, tab);
        });
    }

    async isSupportedByConnector(tab, connector) {
        let doesMatch = false;
        const customMatches = await prefs.get(`connector.${connector.id}.customMatches`) || [];
        const allMatches = connector.matches.concat(customMatches);
        for (let match of allMatches) {
            doesMatch = doesMatch || UrlMatch.test(tab.url, match);
        }
        return doesMatch;
    }

    async onTabsUpdatedListener(tabID, changeInfo, tab) {
        if (changeInfo.status !== 'complete') return;
        for (let connector of connectors) {
            if (!await this.isSupportedByConnector(tab, connector)) {
                continue;
            }
            this.injectIfNotAlready(tabID, connector);
        }
    }

    async injectIfNotAlready(tabId, connector) {
        let isAlreadyInjected = false;
        try {
            const response = await browser.tabs.sendMessage(tabId, 'ping');
            isAlreadyInjected = response === 'pong';
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
