'use strict';

/* global chrome */
/* global define */

define([
    './tab-chooser',
    './controller-proxy',
], (TabChooser, ControllerProxy) => {
    const commands = ['play', 'progress', 'pause', 'play-pause', 'stop', 'metadata',
                      'next', 'previous', 'set', 'reset'];

    const chooser = new TabChooser();
    const proxy = new ControllerProxy('ws://localhost:4000/');

    proxy.onCommand((command, argument) => {
        if (chooser.currentTabId === null) {
            return;
        }
        if (commands.includes(command)) {
            chrome.tabs.sendMessage(chooser.currentTabId, {
                sender: 'vkpc-proxy',
                command,
                argument,
            });
        }
    });
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (sender.tab.id !== chooser.currentTabId) {
            return;
        }
        if (typeof message !== 'object') {
            return;
        }
        const {command, argument} = message;
        if (commands.includes(command)) {
            proxy.sendCommand(command, argument);
        }
    });
});
