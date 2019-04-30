'use strict';

import prefs from 'common/prefs';
import { i18nAll } from 'options/i18n';
import browser from 'webextension-polyfill';

async function addOption(option) {
    const container = document.querySelector('#options');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = option;
    // WTF is with Firefox?
    checkbox.style.display = 'block';
    container.appendChild(checkbox);

    const label = document.createElement('label');
    label.setAttribute('for', checkbox.id);
    label.textContent = browser.i18n.getMessage(`options_${option}`);
    container.appendChild(label);

    checkbox.checked = await prefs.get(option);
    checkbox.addEventListener('change', () => {
        let items = {};
        items[option] = checkbox.checked;
        prefs.set(items);
    });
}

async function addOptions() {
    await addOption('returnToLastOnClose');
    await addOption('pauseOnChange');
    await addOption('playAfterPauseOnChange');
    await addOption('chooseOnEmpty');
}

addOptions();
i18nAll();
