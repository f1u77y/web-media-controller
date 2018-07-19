'use strict';

import Utils from 'background/utils';
import ListenerManager from 'background/listener-manager';
import prefs from 'common/prefs';

class TabChooser {
    constructor() {
        this.ports = new Map();
        this.prevIds = [];
        this.tabId = chrome.tabs.TAB_ID_NONE;
        this.onMessage = new ListenerManager();
        this.wasPlayingBeforeAutoChange = new Map();
        this.lastPlaybackStatus = new Map();

        chrome.runtime.onConnect.addListener(async (port) => {
            if (!port.sender) return;
            if (!port.sender.tab) return;

            this.ports.set(port.sender.tab.id, port);
            chrome.pageAction.show(port.sender.tab.id);

            port.onMessage.addListener((message) => {
                const { name, value } = message;

                if (port.sender.tab.id === this.tabId) {
                    this.onMessage.call(message);
                }

                if (name !== 'playbackStatus') return;

                if (port.sender.tab.id !== this.tabId) {
                    this.setPlaybackStatusIcon(value, port.sender.tab.id);
                    if (['playing'].includes(value)) {
                        this.changeTab(port.sender.tab.id, port);
                    }
                } else {
                    this.setPlaybackStatusIcon(value);
                }
                this.lastPlaybackStatus.set(port.sender.tab.id, value);
            });

            port.onDisconnect.addListener(async (port) => {
                this.filterOut(port.sender.tab.id);
                this.lastPlaybackStatus.delete(port.sender.tab.id);
                if (port.sender.tab.id !== this.tabId) return;
                if (await prefs.get('returnToLastOnClose')) {
                    this.changeTab('last');
                } else {
                    this.changeTab(chrome.tabs.TAB_ID_NONE);
                }
                if (await prefs.get('playAfterPauseOnChange') && this.wasPlayingBeforeAutoChange.get(this.tabId)) {
                    this.sendMessage('play');
                }
            });

            if (await prefs.get('chooseOnEmpty') && this.tabId === chrome.tabs.TAB_ID_NONE) {
                this.changeTab(port.sender.tab.id);
            }
        });
    }

    filterOut(tabId) {
        this.prevIds = this.prevIds.filter(x => x !== tabId);
    }

    exists(tabId) {
        return new Promise((resolve, reject) => {
            if (tabId === chrome.tabs.TAB_ID_NONE) {
                resolve(false);
                return;
            }
            chrome.tabs.get(tabId, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    }

    async changeTab(tabId) {
        if (tabId === this.tabId) return;

        const prevTabId = this.tabId;
        if (await this.exists(prevTabId)) {
            this.setPlaybackStatusIcon('disconnect', prevTabId);
            this.prevIds.push(prevTabId);
        }

        this.tabId = tabId;
        if (this.tabId === 'last') {
            if (this.prevIds.length === 0) {
                this.tabId = chrome.tabs.TAB_ID_NONE;
            } else {
                this.tabId = this.prevIds.pop();
            }
        }
        if (this.tabId === chrome.tabs.TAB_ID_NONE) {
            this.onMessage.call({
                name: 'trackInfo',
                value: {
                    artist: '',
                    album: '',
                    title: '',
                    url: '',
                    length: 0,
                    artUrl: '',
                    trackId: '',
                },
            });
            this.onMessage.call({ name: 'playbackStatus', value: 'stopped' });
            this.onMessage.call({ name: 'currentTime', value: 0 });
        } else {
            this.sendMessage('reload');
        }

        if (await this.exists(prevTabId) && await prefs.get('pauseOnChange')) {
            const wasPlaying = this.lastPlaybackStatus.get(prevTabId) === 'playing';
            this.wasPlayingBeforeAutoChange.set(prevTabId, wasPlaying);
            this.sendMessage(prevTabId, 'pause');
        }
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

export default new TabChooser();
