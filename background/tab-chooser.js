'use strict';

define([
    'background/utils',
    'background/listener-manager',
    'common/prefs',
], (Utils, ListenerManager, prefs) => {
    class TabChooser {
        constructor() {
            this.ports = new Map();
            this.prevIds = [];
            this.tabId = chrome.tabs.TAB_ID_NONE;
            this.onMessage = new ListenerManager();

            chrome.runtime.onConnect.addListener((port) => {
                if (!port.sender) return;
                if (!port.sender.tab) return;

                this.ports.set(port.sender.tab.id, port);
                chrome.pageAction.show(port.sender.tab.id);

                port.onMessage.addListener((message) => {
                    const { name, value } = message;

                    this.onMessage.call(message);

                    if (name === 'playbackStatus') {
                        if (port.sender.tab.id !== this.tabId) {
                            if (['playing'].includes(value)) {
                                this.changeTab(port.sender.tab.id, port);
                                this.setPlaybackStatusIcon(value, port.sender.tab.id);
                            }
                        } else {
                            this.setPlaybackStatusIcon(value);
                        }
                    }
                });

                port.onDisconnect.addListener((port) => {
                    this.filterOut(port.sender.tab.id);
                    if (port.sender.tab.id === this.tabId) {
                        prefs.get('returnToLastOnClose')
                            .then(({ returnToLastOnClose }) => {
                                if (returnToLastOnClose) {
                                    this.changeTab('last');
                                } else {
                                    this.changeTab(chrome.tabs.TAB_ID_NONE);
                                }
                            });
                    }
                });

                prefs.get('chooseOnEmpty')
                    .then(({ chooseOnEmpty }) => {
                        if (chooseOnEmpty && this.tabId === chrome.tabs.TAB_ID_NONE) {
                            this.changeTab(port.sender.tab.id);
                        }
                    });
            });
        }

        filterOut(tabId) {
            this.prevIds = this.prevIds.filter(x => x !== tabId);
        }

        exists(tabId) {
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
            this.exists(prevTabId).then(exists => {
                if (exists) {
                    prefs.get('pauseOnChange')
                        .then(({ pauseOnChange }) => {
                            if (pauseOnChange) {
                                this.sendMessage(prevTabId, 'pause');
                            }
                        });
                    this.setPlaybackStatusIcon('disconnect', prevTabId);
                    this.prevIds.push(prevTabId);
                }
            });

            this.tabId = tabId;
            if (this.tabId === 'last') {
                if (this.prevIds.length === 0) {
                    this.tabId = chrome.tabs.TAB_ID_NONE;
                } else {
                    this.tabId = this.prevIds.pop();
                }
            }
            if (this.tabId === chrome.tabs.TAB_ID_NONE) return;
            this.sendMessage('reload');
        }

        sendMessage(tabId, command, argument) {
            if (typeof tabId === 'string' || typeof tabId === 'object') {
                argument = command;
                command = tabId;
                tabId = this.tabId;
            }
            if (tabId === chrome.tabs.TAB_ID_NONE) return;
            let message = command;
            if (typeof command === 'string') {
                message = { command, argument };
            }
            if (this.ports.has(tabId)) {
                this.ports.get(tabId).postMessage(message);
            }
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
