'use strict';

define([
    './utils',
], (Utils) => {
    class TabChooser {
        constructor() {
            this.tabId = null;
            chrome.runtime.onMessage.addListener((message, sender) => {
                if (!sender.tab) {
                    return;
                }
                if (sender.tab.id !== this.tabId) {
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
                        this.setPlaybackStatusIcon('playing');
                        break;
                    case 'pause':
                        this.setPlaybackStatusIcon('paused');
                        break;
                    }
                }
            });
            chrome.tabs.onRemoved.addListener((tabId) => {
                if (tabId === this.tabId) {
                    this.changeTab(null);
                }
            });
            chrome.tabs.onUpdated.addListener((tabId) => {
                if (this.tabId === null) {
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

        changeTab(tabId) {
            if (this.tabId) {
                this.setPlaybackStatusIcon('disconnect');
            }
            this.tabId = tabId;
            if (this.tabId === null) {
                return;
            }
            this.getFromTab('playback-status')
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
                if (this.tabId === null) {
                    reject('No tab selected');
                } else {
                    let message = command;
                    if (typeof command === 'string') {
                        message = { command, argument };
                    }
                    chrome.tabs.sendMessage(this.tabId, message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError.message);
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
            return this.sendMessage({
                command: 'get-from-tab',
                property: property,
            });
        }

        setPlaybackStatusIcon(status) {
            chrome.pageAction.setTitle({
                tabId: this.tabId,
                title: chrome.i18n.getMessage(`status_${status}`),
            });
            let sizes = [32];
            if (status === 'disconnect') {
                sizes = [16];
            }
            chrome.pageAction.setIcon({
                tabId: this.tabId,
                path: Utils.makeIconPath(status, sizes, 'svg'),
            });
        }
    }
    return new TabChooser();
});