import browser from 'webextension-polyfill';

/**
 * Convert time in seconds to string in MM:SS format.
 * @param  {number} seconds Seconds
 * @returns {string} String in MM:SS format
 */
function secondsToMMSS(num) {
    let seconds = Math.floor(num);
    let minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;

    if (minutes < 10) {
        minutes = `0${minutes}`;
    }
    if (seconds < 10) {
        seconds = `0${seconds}`;
    }
    return `${minutes}:${seconds}`;
}

/**
 * Get currently running OS via WebExtensions API.
 * @param  {number} tabId Tab ID
 * @param  {string} status Status ID
 */
function setBrowserActionStatus(tabId, status) {
    const statusMessage = browser.i18n.getMessage(`status_${status}`);
    const statusIconPath = `icons/${status}.svg`;
    browser.browserAction.setTitle({
        tabId,
        title: statusMessage,
    });
    const settingIcon = browser.browserAction.setIcon({
        tabId,
        path: statusIconPath,
    });
    return settingIcon.then(() => undefined);
}

export default { secondsToMMSS, setBrowserActionStatus };
