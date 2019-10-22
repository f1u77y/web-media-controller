import { $ } from 'content/utils';
import BaseConnector from 'content/base-connector';
import _ from 'underscore';

/**
 * Regular expression used to split artist and track.
 * U+2013 En Dash
 * U+2014 Em Dash
 * U+2015 Horizontal bar
 */
const artistTrackRe = /(.+)\s[-:\u2013\u2014\u2015]\s(.+)/;

const connector = new class extends BaseConnector {
    constructor() {
        super();
        this.name = 'SoundCloud';
        this.prefix = '/com/soundcloud';

        this.artistSelector = '.playbackSoundBadge .playbackSoundBadge__lightLink';
        this.titleSelector = '.playbackSoundBadge .playbackSoundBadge__titleLink span[aria-hidden=true]';

        this.currentTimeSelector = '.playbackTimeline__timePassed span[aria-hidden=true]';
        this.lengthSelector = '.playbackTimeline__duration span[aria-hidden=true]';
        this.playButtonSelector = '.playControls__elements .playControls__play';
        this.prevButtonSelector = '.playControls__elements .skipControl__previous';
        this.nextButtonSelector = '.playControls__elements .skipControl__next';
        this.artSelector = '.playbackSoundBadge__avatar span.sc-artwork';

        this.playerSelector = '.playControls .playControls__inner';
    }

    get playbackStatus() {
        if ($(this.playButtonSelector).classList.contains('playing')) {
            return 'playing';
        } else {
            return 'paused';
        }
    }

    getArtistTrack() {
        const artistTrack = {
            artist: document.querySelector(this.artistSelector).textContent.trim(),
            track: document.querySelector(this.titleSelector).textContent.trim(),
        };
        const match = artistTrackRe.exec(artistTrack.track);

        if (match && ! /.*#\d+.*/.test(match[1])) {
            return { artist: match[1], track: match[2] };
        }

        return artistTrack;
    }

    get artist() {
        return this.getArtistTrack().artist;
    }

    get title() {
        return this.getArtistTrack().track;
    }

    get artUrl() {
        const url = super.artUrl;
        if (url) {
            return url.replace('-t50x50.', '-t200x200.');
        }
        return '';
    }

    get controlsInfo() {
        return _(this.controlsInfo).extend({ canSeek: false });
    }
}();

connector.start();
