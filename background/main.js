'use strict';

define([
    'background/tab-chooser',
], (chooser) => {
    const port = chrome.runtime.connectNative('me.f1u77y.web_media_controller');
    port.onDisconnect.addListener(() => {
        chrome.runtime.getPlatformInfo((info) => {
            if (['linux', 'openbsd'].includes(info.os)) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/disconnect-16.svg'),
                    title: chrome.i18n.getMessage('native_not_installed_title'),
                    message: chrome.i18n.getMessage('native_not_installed_message'),
                    contextMessage: chrome.i18n.getMessage('click_instructions'),
                    isClickable: true,
                }, (currentId) => {
                    chrome.notifications.onClicked.addListener(function instruct(id) {
                        if (id !== currentId) return;
                        chrome.notifications.onClicked.removeListener(instruct);
                        chrome.tabs.create({
                            url: chrome.i18n.getMessage('native_instructions_url'),
                        });
                    });
                });
            } else {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/error-22.svg'),
                    title: chrome.i18n.getMessage('unsupported_os_title'),
                    message: chrome.i18n.getMessage('unsupported_os_message'),
                    contextMessage: chrome.i18n.getMessage('click_uninstall'),
                    isClickable: true,
                }, (currentId) => {
                    chrome.notifications.onClicked.addListener(function uninstall(id) {
                        if (id !== currentId) return;
                        chrome.notifications.onClicked.removeListener(uninstall);
                        chrome.management.uninstallSelf();
                    });
                });
            }
        });
    });

    port.onMessage.addListener((message) => {
        chooser.sendMessage(_.defaults(message, { argument: null }));
    });
    chooser.onMessage.addListener((message) => {
        port.postMessage(_.defaults(message, { value: null }));
    });

    chrome.pageAction.onClicked.addListener((tab) => {
        chooser.changeTab(tab.id);
    });
});
