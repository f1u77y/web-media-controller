'use strict';

/* global chrome */
/* global define */

define([
    './tab-chooser',
    './controller-proxy',
], (TabChooser, ControllerProxy) => {
    const commands = ['play', 'progress', 'pause', 'playpause', 'stop', 'metadata',
                      'next', 'previous'];

    const chooser = new TabChooser();
    const proxy = new ControllerProxy('ws://localhost:4000/');

    proxy.onCommand((command, argument) => {
        if (chooser.currentTabId === null) {
            return;
        }
        const cmd = command.toLowerCase();
        if (commands.includes(cmd)) {
            chrome.tabs.sendMessage(chooser.currentTabId, {
                sender: 'vkpc-proxy',
                command: cmd,
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
