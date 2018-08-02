'use strict';

function makeIconPath(name, sizes = [16, 32, 64, 128], extension = 'png') {
    let result = {};
    for (let size of sizes) {
        result[`${size}`] = `icons/${name}-${size}.${extension}`;
    }
    return result;
}

function capitalize(s) {
    return s.substr(0, 1).toLocaleUpperCase() + s.substr(1);
}

function capitalizeValue({ name, value }) {
    if (typeof value === 'string') {
        value = capitalize(value);
    }
    return { name, value };
}

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
 * Get currently running OS via Chrome API.
 * @returns {string} OS short name
 */
async function getOsName() {
    return (await browser.runtime.getPlatformInfo()).os;
}

export default { makeIconPath, capitalizeValue, secondsToMMSS, getOsName };
