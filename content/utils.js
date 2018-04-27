'use strict';

import _ from 'underscore';

function deepMap(object, f) {
    if (_.isArray(object)) {
        return _(object).map(_.partial(deepMap, _, f));
    } else if (_.isObject(object)) {
        return _(object).mapObject(_.partial(deepMap, _, f));
    } else if (_.isString(object)) {
        return f(object);
    } else {
        return object;
    }
}

function parseTime(text, index, { useFirstValue = false } = {}) {
    let times = text
        .split('/')
        .map(s => s.trim())
        .map(s => s.split(':'))
        .map(s => s.reduce((result, value) => result * 60 + (+value), 0));
    return useFirstValue ? times[0] : times[index];
}

function parseCurrentTime(text, { useFirstValue = false } = {}) {
    return parseTime(text, 0, { useFirstValue });
}

function parseLength(text, { useFirstValue = false } = {}) {
    return parseTime(text, 1, { useFirstValue });
}

/**
    * Extract URL from CSS property.
    * @param  {string} cssProperty CSS property
    * @return {string} Extracted URL
    */
function extractUrlFromCssProperty(cssProperty) {
    let match = /url\((['"]?)(.*)\1\)/.exec(cssProperty);
    if (match) {
        return match[2].trim();
    }
    return null;
}

/**
    * A `document.querySelector` replacement. Waits while there is at least one Node
    * which matches the selector and then resolves with this Node. Note that it uses
    * MutationObserver on the whole DOM, so making it wait long could be expensive
    * It rejects with timeout error if waits more than {@link timeout} milliseconds
    * @param {string|null} selector - A valid CSS selector or null
    * @param {Number} timeout - Timeout in milliseconds
    * @returns a Promise fullfilled with the first matching Node
    */
function query(selector, { timeout = 4000 } = {}) {
    if (selector == null) {
        return Promise.reject(new Error('selector is null'));
    }
    return new Promise((resolve, reject) => {
        let waitObserver = null;
        const tid = setTimeout(() => {
            if (waitObserver) {
                waitObserver.disconnect();
            }
            reject(new Error(`Timeout is reached while finding '${selector}'`));
        }, timeout);
        const elem = document.querySelector(selector);
        if (elem) {
            clearTimeout(tid);
            resolve(elem);
        } else {
            waitObserver = new MutationObserver((mutations, observer) => {
                const elem = document.querySelector(selector);
                if (elem) {
                    clearTimeout(tid);
                    observer.disconnect();
                    resolve(elem);
                }
            });
            waitObserver.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true,
            });
        }
    });
}

function queryText(selector, { timeout = 4000 } = {}) {
    return query(selector, { timeout }).then(node => node.textContent);
}

function queryClick(selector, { timeout = 4000 } = {}) {
    return query(selector, { timeout }).then(node => node.click());
}

export default {
    deepMap, parseCurrentTime, parseLength,
    query, queryText, queryClick, extractUrlFromCssProperty,
};
