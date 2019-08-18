'use strict';

import browser from 'webextension-polyfill';

function i18nAll() {
    const iter = document.createNodeIterator(document.documentElement,
                                             NodeFilter.SHOW_ELEMENT);
    let node = null;
    while ((node = iter.nextNode())) {
        if (node.hasAttribute('i18n-text')) {
            const messageID = node.getAttribute('i18n-text');
            let substitutions = [];
            for (let i = 0; i < 9; ++i) {
                const attrName = `i18n-param-${i}`;
                if (!node.hasAttribute(attrName)) {
                    break;
                }
                substitutions.push(node.getAttribute(attrName));
            }
            console.log(`messageID = ${messageID}`);
            console.log(`subst = ${substitutions.join(';')}`);
            node.textContent = browser.i18n.getMessage(messageID, substitutions);
            console.log(`message = ${browser.i18n.getMessage(messageID, substitutions)}`);
        }
    }
}

export { i18nAll };
