'use strict';

import Utils from 'background/utils';
import ListenerManager from 'background/listener-manager';
import prefs from 'common/prefs';
import browser from 'webextension-polyfill';
import StackSet from 'common/stackset';

class TabChooser {
    constructor() {
        this.ports = new Map();
        this.tabsStack = new StackSet();
        this.tabId = chrome.tabs.TAB_ID_NONE;
        this.onMessage = new ListenerManager();
        this.wasPlayingBeforeAutoChange = new Map();
        this.lastPlaybackStatus = new Map();

        chrome.runtime.onConnect.addListener(async (port) => {
            if (!port.sender) return;
            if (!port.sender.tab) return;

            this.ports.set(port.sender.tab.id, port);
            this.wasPlayingBeforeAutoChange.set(port.sender.tab.id, false);
            this.lastPlaybackStatus.set(port.sender.tab.id, 'stopped');

            chrome.pageAction.show(port.sender.tab.id);

            port.onMessage.addListener((message) => {
                const { name, value } = message;

                if (port.sender.tab.id === this.tabId) {
                    this.onMessage.call(message);
                }

                if (name === 'playbackStatus') {
                    if (port.sender.tab.id !== this.tabId) {
                        this.setPlaybackStatusIcon(value, port.sender.tab.id);
                        if (value === 'playing') {
                            this.changeTab(port.sender.tab.id);
                        }
                    } else {
                        this.setPlaybackStatusIcon(value);
                    }
                    this.lastPlaybackStatus.set(port.sender.tab.id, value);
                }
            });

            port.onDisconnect.addListener(async (port) => {
                this.tabsStack.erase(port.sender.tab.id);
                this.lastPlaybackStatus.delete(port.sender.tab.id);
                this.ports.delete(port.sender.tab.id);
                this.wasPlayingBeforeAutoChange.delete(port.sender.tab.id);

                if (this.tabId === port.sender.tab.id) {
                    const returnToLast = await prefs.get('returnToLastOnClose');
                    const nextTabId = returnToLast ? 'last' : browser.tabs.TAB_ID_NONE;
                    await this.changeTab(nextTabId);
                    if (this.wasPlayingBeforeAutoChange.get(this.tabId) && await prefs.get('playAfterPauseOnChange')) {
                        this.sendMessage('play');
                    }
                }
            });

            if (await prefs.get('chooseOnEmpty') && this.tabId === chrome.tabs.TAB_ID_NONE) {
                this.changeTab(port.sender.tab.id);
            }
        });
    }

    async changeTab(newTabId) {
        if (newTabId === 'last') {
            newTabId = this.tabsStack.pop({ def: browser.tabs.TAB_ID_NONE });
        }
        const oldTabId = this.tabId;
        if (oldTabId === newTabId) return;
        if (this.exists(oldTabId)) {
            this.tabsStack.push(oldTabId);
        }
        this.tabId = newTabId;
        if (this.tabId === browser.tabs.TAB_ID_NONE) {
            this.clearRemoteData();
        } else {
            this.sendMessage('reload');
        }
        if (this.exists(oldTabId) && await prefs.get('pauseOnChange')) {
            const wasPlaying = this.lastPlaybackStatus.get(oldTabId) === 'playing';
            this.wasPlayingBeforeAutoChange.set(oldTabId, wasPlaying);
            this.sendMessage(oldTabId, 'pause');
        }
    }

    clearRemoteData() {
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
    }

    exists(tabId) {
        return this.ports.has(tabId);
    }

    async sendMessage(tabId, command, argument) {
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
