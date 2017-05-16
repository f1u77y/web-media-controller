'use strict';

/* global chrome */
/* global define */

define([
    './tab-chooser',
], (chooser) => {
    const port = chrome.runtime.connectNative('me.f1u77y.vkpc');
    port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
    });
    port.onMessage.addListener((message) => {
        chooser.sendMessage(_.defaults(message, { argument: null }));
    });

    chrome.runtime.onMessage.addListener((message, sender) => {
        if (sender.tab.id !== chooser.currentTabId) {
            return;
        }
        port.postMessage(message);
    });
    chrome.pageAction.onClicked.addListener((tab) => {
        if (tab.id !== chooser.currentTabId) {
            chooser.changeTab(tab.id);
        }
    });
});
