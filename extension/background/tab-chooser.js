'use strict';

define([
    './utils',
], (Utils) => {
    class TabChooser {
        constructor() {
            this.tabId = chrome.tabs.TAB_ID_NONE;
            chrome.runtime.onMessage.addListener((message, sender) => {
                if (!sender.tab) return;

                const { name, value } = message;
                if (name === 'playbackStatus') {
                    if (sender.tab.id !== this.tabId) {
                        if (['playing'].includes(value)) {
                            this.changeTab(sender.tab.id);
                        }
                    } else {
                        this.setPlaybackStatusIcon(value);
                    }
                }
            });
            chrome.tabs.onRemoved.addListener((tabId) => {
                if (tabId === this.tabId) {
                    this.changeTab(chrome.tabs.TAB_ID_NONE);
                }
            });
            chrome.tabs.onUpdated.addListener((tabId) => {
                if (this.tabId === chrome.tabs.TAB_ID_NONE) {
                    this.ifCanControl(tabId).then(() => {
                        this.changeTab(tabId);
                    });
                    return;
                }
                if (tabId !== this.tabId) {
                    return;
                }
                this.sendMessage('reload');
            });
        }

        ifCanControl(tabId) {
            return new Promise((resolve) => {
                chrome.tabs.sendMessage(tabId, 'ping', (response) => {
                    if (response === 'pong') {
                        resolve();
                    }
                });
            });
        }

        ifExists(tabId) {
            return new Promise((resolve) => {
                if (tabId === chrome.tabs.TAB_ID_NONE) return;
                chrome.tabs.get(tabId, () => {
                    if (!chrome.runtime.lastError) {
                        resolve(tabId);
                    }
                });
            });
        }

        changeTab(tabId) {
            if (tabId === this.tabId) return;

            const prevTabId = this.tabId;
            this.ifExists(prevTabId)
                .then(() => this.setPlaybackStatusIcon('disconnect', prevTabId));

            this.tabId = tabId;
            if (this.tabId === chrome.tabs.TAB_ID_NONE) return;

            this.getFromTab('playbackStatus')
                .then(status => {
                    this.setPlaybackStatusIcon(status || 'disconnect');
                })
                .catch(() => {
                    this.setPlaybackStatusIcon('disconnect');
                });
            this.sendMessage('reload');
        }

        sendMessage(command, argument = null) {
            return new Promise((resolve, reject) => {
                if (this.tabId === chrome.tabs.TAB_ID_NONE) {
                    reject('No tab selected');
                } else {
                    let message = command;
                    if (typeof command === 'string') {
                        message = { command, argument };
                    }
                    chrome.tabs.sendMessage(this.tabId, message, (response) => {
                        if (chrome.runtime.lastError) {
                            return;
                        } else if (response.error) {
                            reject(response.error);
                        } else {
                            resolve(response);
                        }
                    });
                }
            });
        }

        getFromTab(property) {
            return this.sendMessage('getFromTab', property);
        }

        setPlaybackStatusIcon(status, tabId = this.tabId) {
            chrome.pageAction.setTitle({
                tabId: tabId,
                title: chrome.i18n.getMessage(`status_${status}`),
            });
            let sizes = [32];
            if (status === 'disconnect') {
                sizes = [16];
            }
            chrome.pageAction.setIcon({
                tabId: tabId,
                path: Utils.makeIconPath(status, sizes, 'svg'),
            });
        }
    }
    return new TabChooser();
});
