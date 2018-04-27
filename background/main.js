'use strict';

define([
    'background/tab-chooser',
    'background/adapters/mpris2',
    'background/adapters/rainmeter',
    'background/utils',
    'underscore',
], (chooser, Mpris2Adapter, RainmeterAdapter, Utils, _) => {
    const SUPPORTED_OSES = ['linux', 'openbsd', 'win'];

    setupAppAdapter();

    /**
     * Entry point.
     */
    function setupAppAdapter() {
        isOsSupported().then(isSupported => {
            if (!isSupported) {
                notifyOsIsNotSupported();
                return;
            }

            getAppAdapter().then(appAdapter => {
                return appAdapter.connect();
            }).then(appAdapter => {
                appAdapter.onMessage.addListener((message) => {
                    chooser.sendMessage(_.defaults(message, { argument: null }));
                });
                chooser.onMessage.addListener((message) => {
                    appAdapter.sendMessage(message);
                });
            }).catch(showInstructions);
        });
    }

    /**
     * Return application adapter depends on running OS.
     * @returns {object} Application adapter
     */
    function getAppAdapter() {
        return Utils.getOsName().then(name => {
            if (['linux', 'openbsd'].includes(name)) {
                return new Mpris2Adapter();
            } else if (name === 'win') {
                return new RainmeterAdapter();
            }

            throw new Error('Unable to get application adapter');
        });
    }

    /**
     * Check if currently running OS is supported.
     * @return {boolean} Check result
     */
    function isOsSupported() {
        return Utils.getOsName().then(name => {
            return SUPPORTED_OSES.includes(name);
        });
    }

    /**
     * Show notification if currently running OS is not supported.
     */
    function notifyOsIsNotSupported() {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/error-22.svg'),
            title: chrome.i18n.getMessage('unsupported_os_title'),
            message: chrome.i18n.getMessage('unsupported_os_message'),
            contextMessage: chrome.i18n.getMessage('click_uninstall'),
            isClickable: true,
        }, (currentId) => {
            chrome.notifications.onClicked.addListener(function uninstall(id) {
                if (id !== currentId) {
                    return;
                }
                chrome.notifications.onClicked.removeListener(uninstall);
                chrome.management.uninstallSelf();
            });
        });
    }

    /**
     * Show notification with instructions.
     */
    function showInstructions() {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/disconnect-16.svg'),
            title: chrome.i18n.getMessage('native_not_installed_title'),
            message: chrome.i18n.getMessage('native_not_installed_message'),
            contextMessage: chrome.i18n.getMessage('click_instructions'),
            isClickable: true,
        }, (currentId) => {
            chrome.notifications.onClicked.addListener(function instruct(id) {
                if (id !== currentId) {
                    return;
                }
                chrome.notifications.onClicked.removeListener(instruct);
                chrome.tabs.create({
                    url: chrome.i18n.getMessage('native_instructions_url'),
                });
            });
        });
    }
});
