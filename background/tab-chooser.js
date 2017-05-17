'use strict';

define([
    './utils',
], (Utils) => {
    class TabChooser {
        constructor() {
            this.currentTabId = null;
            this.onTabChanged = null;
            chrome.runtime.onMessage.addListener((message, sender) => {
                if (!sender.tab) {
                    return;
                }
                if (sender.tab.id !== this.currentTabId) {
                    switch (message.command) {
                    case 'play':
                    case 'progress':
                        this.changeTab(sender.tab.id);
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
            chrome.tabs.onRemoved.addListener((tabId) => {
                if (tabId === this.currentTabId) {
                    this.changeTab(null);
                }
            });
            chrome.tabs.onUpdated.addListener((tabId) => {
                if (tabId !== this.currentTabId) {
                    return;
                }
                this.sendMessage({ command: 'reload' });
            });
        }

        changeTab(tabId) {
            if (this.currentTabId) {
                chrome.pageAction.setTitle({
                    tabId: this.currentTabId,
                    title: 'Not playing',
                });
                chrome.pageAction.setIcon({
                    tabId: this.currentTabId,
                    path: Utils.makeIconPath('disconnect'),
                });
            }
            this.currentTabId = tabId;
            if (tabId) {
                chrome.pageAction.setTitle({
                    tabId: this.currentTabId,
                    title: 'Playing',
                });
                chrome.pageAction.setIcon({
                    tabId: this.currentTabId,
                    path: Utils.makeIconPath('playing'),
                });
            }
            this.sendMessage({ command: 'reload' });
        }

        sendMessage(message) {
            if (this.currentTabId === null) {
                return;
            }
            chrome.tabs.sendMessage(this.currentTabId, message);
        }
    }
    return new TabChooser();
});
