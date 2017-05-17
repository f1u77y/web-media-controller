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
                    case 'play':
                        this.setPlaybackStatus('playing');
                        break;
                    case 'pause':
                        this.setPlaybackStatus('paused');
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
                    path: Utils.makeIconPath('disconnect', [16], 'svg'),
                });
            }
            this.currentTabId = tabId;
            if (tabId) {
                this.getPlaybackStatus().then((status) => {
                    this.setPlaybackStatus(status || 'disconnect');
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

        getPlaybackStatus() {
            const tabId = this.currentTabId;
            return new Promise((resolve, reject) => {
                if (tabId === null) {
                    reject('No tab selected');
                } else {
                    chrome.tabs.sendMessage(tabId, {
                        command: 'get-playback-status'
                    }, (response) => {
                        resolve(response);
                    });
                }
            });
        }

        setPlaybackStatus(status) {
            chrome.pageAction.setTitle({
                tabId: this.currentTabId,
                title: status,
            });
            let sizes = [32];
            if (status === 'disconnect') {
                sizes = [16];
            }
            chrome.pageAction.setIcon({
                tabId: this.currentTabId,
                path: Utils.makeIconPath(status, sizes, 'svg'),
            });
        }
    }
    return new TabChooser();
});
