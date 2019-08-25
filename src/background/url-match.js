/**
 * Module to test if URL patterns match strings.
 * It's used because chrome does not support extraParameters in tabs.onUpdated
 */

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create regex from single match pattern.
 * @param  {String} pattern URL pattern as string
 * @return {Object} RegExp based on pattern string
 */
function matchPatternToRegExp(pattern) {
    if (typeof pattern !== 'string') {
        return null;
    }

    if (pattern === '<all_urls>') {
        return /^.*$/;
    }

    const urlPartsMatch = /^(\*|https?|file|ftp|chrome-extension):\/\/([^/]*)(\/.*)/.exec(pattern);
    if (!urlPartsMatch) {
        return null;
    }
    const scheme = urlPartsMatch[1];
    const host = urlPartsMatch[2];
    const file = urlPartsMatch[3];

    let result = '';

    if (scheme === '*') {
        result += 'https?';
    } else {
        result += `${scheme}`;
    }
    result += escapeRegExp('://');

    if (scheme === 'file' && host !== '' || scheme !== file && host === '') {
        return null;
    }
    if (host === '*') {
        result += '[^\\/]+';
    } else if (host[0] === '*') {
        result += `([^\\/]+\\.|)${escapeRegExp(host.substr(2))}`;
    } else {
        result += escapeRegExp(host);
    }

    result += file.split('*').map(escapeRegExp)
        .join('.*');

    return new RegExp(result);
}

/**
 * Test if URL matches given URL pattern.
 * @param  {String} string URL
 * @param  {String} pattern URL pattern
 * @return {Boolean} Result
 */
function test(string, pattern) {
    const regexp = matchPatternToRegExp(pattern);
    if (!regexp) {
        return false;
    }
    return regexp.test(string);
}

export { test };
