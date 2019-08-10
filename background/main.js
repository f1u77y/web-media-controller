'use strict';

import chooser from 'background/tab-chooser';
import Mpris2Adapter from 'background/adapters/mpris2';
import RainmeterAdapter from 'background/adapters/rainmeter';
import Utils from 'background/utils';
import ContentInjector from 'background/content-injector';
import _ from 'underscore';
import browser from 'webextension-polyfill';

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
        const injector = new ContentInjector();
        injector.start();
        appAdapter.onMessage.addListener((message) => {
            chooser.sendMessage(_.defaults(message, { argument: null }));
        });
        chooser.onMessage.addListener((message) => {
            appAdapter.sendMessage(message);
        });
    } catch (e) {
        showInstructions();
        throw e;
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
    browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/error-22.svg'),
        title: browser.i18n.getMessage('unsupported_os_title'),
        message: browser.i18n.getMessage('unsupported_os_message'),
        contextMessage: browser.i18n.getMessage('click_uninstall'),
        isClickable: true,
    }, (currentId) => {
        browser.notifications.onClicked.addListener(function uninstall(id) {
            if (id !== currentId) {
                return;
            }
            browser.notifications.onClicked.removeListener(uninstall);
            browser.management.uninstallSelf();
        });
    });
}

/**
 * Show notification with instructions.
 */
async function showInstructions() {
    const currentId = await browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/disconnect-16.svg'),
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
