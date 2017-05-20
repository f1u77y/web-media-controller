'use strict';

/* global chrome */
/* global define */

define([
    './tab-chooser',
], (chooser) => {
    const port = chrome.runtime.connectNative('me.f1u77y.web_media_controller');
    port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
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
