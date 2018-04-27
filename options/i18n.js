'use strict';

define(() => {
    function i18nAll() {
        const iter = document.createNodeIterator(document.documentElement,
                                                 NodeFilter.SHOW_ELEMENT);
        let node = null;
        while ((node = iter.nextNode())) {
            if (node.hasAttribute('i18n-text')) {
                const id = node.getAttribute('i18n-text');
                node.textContent = chrome.i18n.getMessage(id);
            }
        }
    }

    return {i18nAll};
});
