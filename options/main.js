'use strict';

define([
    'common/prefs',
], (prefs) => {
    function addOption(option) {
        const container = document.querySelector('#options');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = option;
        // WTF is with Firefox?
        checkbox.style.display = 'block';
        container.appendChild(checkbox);

        const span = document.createElement('span');
        span.textContent = chrome.i18n.getMessage(`options_${option}`);
        container.appendChild(span);

        prefs.get(option).then((items) => {
            checkbox.checked = items[option];
        });
        checkbox.addEventListener('change', () => {
            let items = {};
            items[option] = checkbox.checked;
            prefs.set(items);
        });
    }

    addOption('returnToLastOnClose');
    addOption('pauseOnChange');
    addOption('playAfterPauseOnChange');
    addOption('chooseOnEmpty');
});
