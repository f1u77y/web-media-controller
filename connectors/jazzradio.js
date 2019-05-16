'use strict';

import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';
import _ from 'underscore';

new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'JazzRadio';
        this.prefix = '/com/jazzradio';
        this.playButtonSelector = '.icon-play';
        this.stopButtonSelector = '.icon-pause';
        this.artistSelector = '.artist-name';
        this.titleSelector = '.track-name';
        this.lengthSelector = '.total';
        this.currentTimeSelector = '.time';
        this.artSelector = '#art';
    }
};
