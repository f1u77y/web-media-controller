'use strict';

import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';

new class extends BaseConnector {
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

        Utils.query('.playControls .playControls__inner').then(elem => this.observe(elem));
    }

    get playbackStatus() {
        return Utils.query(this.playButtonSelector).then(elem => elem.classList.contains('playing') ? 'playing' : 'paused');
    }

    getArtistTrack() {
       const data_track = {artist: document.querySelector(this.artistSelector).textContent.trim(),
                           track_title: document.querySelector(this.titleSelector).textContent.trim()};
       const match = /(.+)\s[-–—:]\s(.+)/.exec(data_track.track_title);

       if (match && ! /.*#\d+.*/.test(match[1]))
           return {artist: match[1], track_title: match[2]};

       return data_track;
    }

    get artist() {
        return this.getArtistTrack().artist;
    }

    get title() {
        return this.getArtistTrack().track_title;
    }

    get artUrl() {
        return super.artUrl.then(url => url.replace('-t50x50\.', '-t200x200\.'));
    }
};
