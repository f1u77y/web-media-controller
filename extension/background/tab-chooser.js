'use strict';

define([
    './utils',
], (Utils) => {
    class ListenerManager {
        constructor() {
            this.listeners = new Set();
        }

        addListener(listener) {
            this.listeners.add(listener);
        }

        removeListener(listener) {
            this.listeners.remove(listener);
        }

        call(...args) {
            for (let listener of this.listeners) {
                listener(...args);
            }
        }
    }

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
                            }
                        } else {
                            this.setPlaybackStatusIcon(value);
                        }
                    }
                });

                port.onDisconnect.addListener((port) => {
                    this.filterOut(port.sender.tab.id);
                    if (port.sender.tab.id === this.tabId) {
                        this.changeTab('last');
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

        sendMessage(command, argument = null) {
            if (this.tabId === chrome.tabs.TAB_ID_NONE) return;
            let message = command;
            if (typeof command === 'string') {
                message = { command, argument };
            }
            if (this.ports.has(this.tabId)) {
                this.ports.get(this.tabId).postMessage(message);
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
