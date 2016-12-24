'use strict';

/* global chrome */
/* global define */

define([
    './tab-chooser',
    './controller-proxy',
], (TabChooser, ControllerProxy) => {
    const chooser = new TabChooser();
    const proxy = new ControllerProxy('ws://localhost:4000/');

    proxy.onCommand((command, argument) => {
        if (chooser.currentTabId === null) {
            return;
        }
        chrome.tabs.sendMessage(chooser.currentTabId, {
            sender: 'vkpc-proxy',
            command,
            argument,
        });
    });
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (sender.tab.id !== chooser.currentTabId) {
            return;
        }
        if (typeof message !== 'object') {
            return;
        }
        const {command, argument} = message;
        proxy.sendCommand(command, argument);
    });
});
