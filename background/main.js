'use strict';

/* global chrome */
/* global define */

define([
    './tab-chooser',
], (chooser) => {
    const port = chrome.runtime.connectNative('me.f1u77y.web_media_controller');
    port.onDisconnect.addListener((p) => {
        if (p.error) {
            console.log(p.error.message);
        }
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

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.command === 'show-page-action') {
            chrome.pageAction.show(sender.tab.id);
            sendResponse('done');
            return;
        }
        if (sender.tab.id !== chooser.tabId) {
            sendResponse('none');
        } else {
            sendResponse('done');
        }
        port.postMessage(message);
    });
    chrome.pageAction.onClicked.addListener((tab) => {
        if (tab.id !== chooser.tabId) {
            chooser.changeTab(tab.id);
        }
    });
});
