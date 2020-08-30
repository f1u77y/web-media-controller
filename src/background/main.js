import ContentInjector from 'background/content-injector';
import Mpris2Adapter from 'background/adapters/mpris2';
import RainmeterAdapter from 'background/adapters/rainmeter';
import TabChooser from 'background/tab-chooser';
import Utils from 'background/utils';
import _ from 'underscore';
import browser from 'webextension-polyfill';

class Background {
    constructor() {
        this.connectionStatus = 'disconnected';
        this.appAdapter = null;
        this.injector = new ContentInjector();
        this.tabChooser = new TabChooser(this);
    }

    /**
     * Show notification with instructions.
     */
    async showInstructions() {
        const currentId = await browser.notifications.create({
            type: 'basic',
            iconUrl: browser.runtime.getURL('icons/disconnected.svg'),
            title: browser.i18n.getMessage('native_not_installed_title'),
            message: browser.i18n.getMessage('native_not_installed_message'),
            contextMessage: browser.i18n.getMessage('click_instructions'),
            isClickable: true,
        });
        browser.notifications.onClicked.addListener(function instruct(id) {
            if (id !== currentId) {
                return;
            }
            browser.notifications.onClicked.removeListener(instruct);
            browser.tabs.create({
                url: browser.i18n.getMessage('native_instructions_url'),
            });
        });
    }

    /**
     * Return application adapter depends on which is supported
     * @returns {object} Application adapter
     */
    async getAppAdapter() {
        const adapters = [
            new Mpris2Adapter(),
            new RainmeterAdapter(),
        ];
        const isAdapterSupported = await Promise.all(adapters.map((adapter) => adapter.isSupported()));
        for (let i = 0; i < adapters.length; ++i) {
            if (isAdapterSupported[i]) {
                return adapters[i];
            }
        }
        return null;
    }

    setConnectionStatus(newStatus) {
        const promises = [];
        if (newStatus === 'disconnected') {
            promises.push(Utils.setBrowserActionStatus(null, newStatus));
            for (const tabId of this.tabChooser.supportedTabs()) {
                promises.push(Utils.setBrowserActionStatus(tabId, newStatus));
            }
        } else {
            promises.push(Utils.setBrowserActionStatus(null, 'disabled'));
            for (const tabId of this.tabChooser.supportedTabs()) {
                promises.push(this.tabChooser.resetBrowserActionStatus(tabId));
            }
        }
        this.connectionStatus = newStatus;
        return Promise.all(promises).then(() => undefined);
    }

    async trySetupAppAdapter() {
        if (this.connectionStatus === 'connected') {
            return;
        }
        const appAdapter = await this.getAppAdapter();
        if (appAdapter === null) {
            this.showInstructions();
        } else {
            appAdapter.onMessage.addListener((message) => {
                this.tabChooser.sendMessage('current', _.defaults(message, { argument: null }));
            });
            await appAdapter.connect();
            this.tabChooser.resendCurrentTabInfo();
            this.setConnectionStatus('connected');
            this.appAdapter = appAdapter;
            this.appAdapter.onDisconnect.addListener((appAdapter) => {
                this.setConnectionStatus('disconnected');
                appAdapter.onMessage.clearListeners();
            });
        }
    }

    async start() {
        this.injector.start();
        this.tabChooser.onMessage.addListener((message) => {
            if (this.appAdapter === null) return;
            this.appAdapter.sendMessage(message);
        });
        await this.setConnectionStatus('disconnected');
        this.trySetupAppAdapter();
        browser.browserAction.onClicked.addListener(() => this.trySetupAppAdapter());
    }
}


new Background().start();
