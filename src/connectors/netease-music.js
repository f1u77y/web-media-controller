import { $ } from 'content/utils';
import BaseConnector from 'content/base-connector';
import _ from 'underscore';

const connector = new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Netease.Music';
        this.prefix = '/com/163/music';

        this.artistSelector = '.by.f-thide.f-fl > span';
        this.albumSelector = '.j-flag.words > a[class*="src"]';
        this.artSelector = '.head.j-flag > img';
        this.titleSelector = '.f-thide.name.fc1.f-fl';

        this.currentTimeSelector = '.j-flag.time em';

        this.playButtonSelector = '.ply.j-flag';
        this.prevButtonSelector = '.prv';
        this.nextButtonSelector = '.nxt';

        this.playerSelector = '#g_player';
    }

    get playbackStatus() {
        if ($('.btns').querySelector('.ply.j-flag.pas')) {
            return 'playing';
        }
        return 'paused';
    }

    get length() {
        let length = document
            .querySelector('.j-flag.time')
            .lastChild.data.replace('/', '')
            .trim()
            .split(':');
        length =
            parseInt(length[0]) * 60000 + parseInt(length[1]) * 1000;
        return length;
    }

    get artUrl() {
        return super.artUrl.replace('34y34', '200y200');
    }

    get controlsInfo() {
        return _(super.controlsInfo).extend({
            canSeek: false,
            canStop: false,
        });
    }
}();

connector.start();
