'use strict';

import browser from 'webextension-polyfill';

function i18nAll() {
    const iter = document.createNodeIterator(document.documentElement,
                                             NodeFilter.SHOW_ELEMENT);
    let node = null;
    while ((node = iter.nextNode())) {
        if (node.hasAttribute('i18n-text')) {
            const id = node.getAttribute('i18n-text');
            node.textContent = browser.i18n.getMessage(id);
        }
    }
}

export { i18nAll };
