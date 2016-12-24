'use strict';

/* global chrome */
/* global define */

define(() => {
    function executeIfExists(tab, callback) {
        if (!tab) {
            return;
        }
        chrome.tabs.get(tab, () => {
            if (!chrome.runtime.lastError) {
                callback(tab);
            }
        });
    }

    class TabChooser {
        constructor() {
            this.currentTabId = null;
            this.onTabChanged = null;
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (!sender.tab) {
                    return;
                }
                if (sender.tab.id !== this.currentTabId) {
                    switch (message.command) {
                    case 'force-load':
                        this.changeTab(sender.tab.id, sendResponse);
                        break;
                    case 'load':
                        if (this.currentTabId === null) {
                            this.changeTab(sender.tab.id, sendResponse);
                        }
                        break;
                    case 'play':
                    case 'progress':
                        chrome.storage.local.get('switch-tabs-on-play', (items) => {
                            if (items['switch-tabs-on-play']) {
                                this.changeTab(sender.tab.id, sendResponse);
                            }
                        });
                        break;
                    }
                } else {
                    switch (message.command) {
                    case 'force-unload':
                        this.changeTab(null);
                        break;
                    }
                }
            });
        }

        changeTab(tabId, sendResponse) {
            this.currentTabId = tabId;
            if (sendResponse) {
                sendResponse({status: 'current'});
            }
        }

        sendMessage(message) {
            if (this.currentTabId === null) {
                return;
            }
            chrome.tabs.sendMessage(this.currentTabId, message);
        }

        withCurrentTab({load = null, unload = null} = {}) {
            if (unload) {
                unload();
            }
            executeIfExists(this.currentTabId, load);
            chrome.tabs.onActivated.removeListener(this.onTabChanged);
            this.onTabChanged = ({tabId}) => {
                if (unload) {
                    unload();
                }
                executeIfExists(tabId, load);
            };
            chrome.tabs.onActivated.addListener(this.onTabChanged);
        }
    }
    return new TabChooser();
});
