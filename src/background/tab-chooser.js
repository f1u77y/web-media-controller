import ListenerManager from 'background/listener-manager';
import StackSet from 'common/stackset';
import Utils from 'background/utils';
import browser from 'webextension-polyfill';
import prefs from 'common/prefs';

class TabChooser {
    constructor() {
        this.ports = new Map();
        this.tabsStack = new StackSet();
        this.tabId = browser.tabs.TAB_ID_NONE;
        this.onMessage = new ListenerManager();
        this.wasPlayingBeforeAutoChange = new Map();
        this.lastPlaybackStatus = new Map();

        browser.runtime.onConnect.addListener(async (port) => {
            if (!port.sender) return;
            if (!port.sender.tab) return;

            this.ports.set(port.sender.tab.id, port);
            this.wasPlayingBeforeAutoChange.set(port.sender.tab.id, false);
            this.lastPlaybackStatus.set(port.sender.tab.id, 'stopped');

            browser.pageAction.show(port.sender.tab.id);

            port.onMessage.addListener((message) => {
                const { name, value } = message;

                if (port.sender.tab.id === this.tabId) {
                    this.onMessage.call(message);
                }

                if (name === 'playbackStatus') {
                    if (port.sender.tab.id === this.tabId) {
                        this.setPlaybackStatusIcon(value);
                    } else {
                        this.setPlaybackStatusIcon(value, port.sender.tab.id);
                        if (value === 'playing') {
                            this.changeTab(port.sender.tab.id);
                        }
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
                        this.sendMessage('current', { command: 'play' });
                    }
                }
            });

            if (await prefs.get('chooseOnEmpty') && this.tabId === browser.tabs.TAB_ID_NONE) {
                this.changeTab(port.sender.tab.id);
            }
        });
    }

    async changeTab(newTabIdOrLast) {
        const newTabId = newTabIdOrLast === 'last' ? this.tabsStack.pop({ def: browser.tabs.TAB_ID_NONE }) : newTabIdOrLast;
        const oldTabId = this.tabId;
        if (oldTabId === newTabId) return;
        if (this.exists(oldTabId)) {
            this.tabsStack.push(oldTabId);
        }
        this.tabId = newTabId;
        if (this.tabId === browser.tabs.TAB_ID_NONE) {
            this.clearRemoteData();
        } else {
            this.sendMessage('current', { command: 'reload' });
        }
        if (this.exists(oldTabId) && await prefs.get('pauseOnChange')) {
            const wasPlaying = this.lastPlaybackStatus.get(oldTabId) === 'playing';
            this.wasPlayingBeforeAutoChange.set(oldTabId, wasPlaying);
            this.sendMessage(oldTabId, { command: 'pause' });
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
        this.onMessage.call({ name: 'controlsInfo', value: {
            canGoNext: false,
            canGoPrevious: false,
            canPlay: false,
            canPause: false,
            canSeek: false,
        }});
    }

    exists(tabId) {
        return this.ports.has(tabId);
    }

    async sendMessage(tabIdOrCurrent, message) {
        const tabId = tabIdOrCurrent === 'current' ? this.tabId : tabIdOrCurrent;
        if (tabId === browser.tabs.TAB_ID_NONE) return;
        if (this.ports.has(tabId)) {
            this.ports.get(tabId).postMessage(message);
        }
    }

    setPlaybackStatusIcon(status, tabId = this.tabId) {
        browser.pageAction.setTitle({
            tabId,
            title: browser.i18n.getMessage(`status_${status}`),
        });
        let sizes = [32];
        if (status === 'disconnect') {
            sizes = [16];
        }
        browser.pageAction.setIcon({
            tabId,
            path: Utils.makeIconPath(status, sizes, 'svg'),
        });
    }
}

export default new TabChooser();
