'use strict';

import prefs from 'common/prefs';
import defaults from 'common/defaults';
import { i18nAll } from 'options/i18n';
import connectors from 'background/connectors';

import $ from 'jquery';
import Mustache from 'mustache';
import bootstrap from 'bootstrap';
import browser from 'webextension-polyfill';

async function addReactiveOptionLogic(optionName) {
    const $checkbox = $(`#chk-${optionName}`);
    $checkbox.attr('checked', await prefs.get(optionName));
    $checkbox.on('change', function () {
        prefs.set({[optionName]: this.checked});
    });
}

class CustomMatchesView {
    constructor() {
        this.unusedMatchID = 0;
        this.connector = null;
    }

    setup() {
        const $modal = $('#modal-connector');

        $('button#modal-connector-add-match').on('click', () => this.appendMatchElement(''));
        $('button#modal-connector-cancel').on('click', () => $modal.modal('hide'));
        $('button#modal-connector-save').on('click', () => this.save());
        $('button#modal-connector-reset').on('click', () => this.reset());

        for (let connector of connectors) {
            this.setupConnector(connector);
        }
    }

    setupConnector(connector) {
        const $editButton = $(`#btn-edit-connector-${connector.id}`);
        $editButton.on('click', () => {
            this.connector = connector;
            const modalTitle = browser.i18n.getMessage('change_match_patterns', this.connector.label);
            $('#modal-connector .modal-title').text(modalTitle);
            this.reset();
        });
    }

    get matchesPrefKey() {
        return `connector.${this.connector.id}.customMatches`;
    }

    save() {
        const matches = $('#modal-connector .modal-body .input-match').toArray().map(elem => elem.value);
        const nonEmptyMatches = matches.filter(match => match.length > 0);
        prefs.set({[this.matchesPrefKey]: nonEmptyMatches});
        $('#modal-connector').modal('hide');
    }

    async reset() {
        this.clear();
        const lastMatches = (await prefs.get(this.matchesPrefKey)) || [];
        for (let match of lastMatches) {
            this.appendMatchElement(match);
        }
    }

    clear() {
        this.unusedMatchID = 0;
        $('#modal-connector-matches .input-group').each((index, elem) => {
            this.removeMatchElement($(elem));
        });
    }

    async appendMatchElement(match) {
        const id = this.unusedMatchID++;
        const $matchElement = $(await this.generateMatchElementHTML(match, id));
        $matchElement.find('.input-group-remove').on('click', () => this.removeMatchElement($matchElement));
        $('#modal-connector-matches').append($matchElement);
    }

    removeMatchElement($matchElement) {
        $matchElement.find('.input-group-remove').off('click');
        $matchElement.remove();
    }

    async generateMatchElementHTML(match, id) {
        const response = await fetch(browser.runtime.getURL('options/match-input.mustache'));
        const template = await response.text();
        return Mustache.render(template, {match, id});
    }
}

for (let optionName of Object.keys(defaults)) {
    addReactiveOptionLogic(optionName);
}

const customMatchesView = new CustomMatchesView();
customMatchesView.setup();

i18nAll();
