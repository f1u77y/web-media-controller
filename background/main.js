'use strict';

import chooser from 'background/tab-chooser';
import Mpris2Adapter from 'background/adapters/mpris2';
import RainmeterAdapter from 'background/adapters/rainmeter';
import Utils from 'background/utils';
import _ from 'underscore';

const SUPPORTED_OSES = ['linux', 'openbsd', 'win'];

setupAppAdapter();

/**
 * Entry point.
 */
async function setupAppAdapter() {
    if (!await isOsSupported()) {
        notifyOsIsNotSupported();
        return;
    }
    try {
        const appAdapter = await getAppAdapter();
        await appAdapter.connect();
        appAdapter.onMessage.addListener((message) => {
            chooser.sendMessage(_.defaults(message, { argument: null }));
        });
        chooser.onMessage.addListener((message) => {
            appAdapter.sendMessage(message);
        });
    } catch (e) {
        showInstructions();
    }
}

/**
 * Return application adapter depends on running OS.
 * @returns {object} Application adapter
 */
async function getAppAdapter() {
    const os = await Utils.getOsName();
    if (['linux', 'openbsd'].includes(os)) {
        return new Mpris2Adapter();
    } else if (os === 'win') {
        return new RainmeterAdapter();
    } else {
        throw new Error('OS is not supported');
    }
}

/**
 * Check if currently running OS is supported.
 * @return {boolean} Check result
 */
async function isOsSupported() {
    return SUPPORTED_OSES.includes(await Utils.getOsName());
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
async function showInstructions() {
    const currentId = await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/disconnect-16.svg'),
        title: chrome.i18n.getMessage('native_not_installed_title'),
        message: chrome.i18n.getMessage('native_not_installed_message'),
        contextMessage: chrome.i18n.getMessage('click_instructions'),
        isClickable: true,
    });
    chrome.notifications.onClicked.addListener(function instruct(id) {
        if (id !== currentId) {
            return;
        }
        chrome.notifications.onClicked.removeListener(instruct);
        chrome.tabs.create({
            url: chrome.i18n.getMessage('native_instructions_url'),
        });
    });
}
