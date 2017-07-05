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

        const label = document.createElement('label');
        label.setAttribute('for', checkbox.id);
        label.textContent = chrome.i18n.getMessage(`options_${option}`);
        container.appendChild(label);

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
