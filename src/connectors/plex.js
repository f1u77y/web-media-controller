/*
 * Plex UI doesn't allow to click on elements using
 * HTMLElement.click function. We need to emulate clicks
 * using MouseEvents and EventTarget.dispatchEvent function.
 */

import BaseConnector from 'content/base-connector';
import Utils from 'content/utils';

const playerBarSelector = '[class^=ControlsContainer-controlsContainer]';
const playerContainerSelector = '[class^=AudioVideoPlayerView-container]';

const connector = new class extends BaseConnector {
    constructor() {
        super();

        this.name = 'Plex';
        this.prefix = '/tv/plex';

        this.titleSelector = `${playerBarSelector} a[class*=MetadataPosterTitle-singleLineTitle]`;
        this.albumSelector = `${playerBarSelector} [class*=MetadataPosterTitle-title] > a:nth-child(3)`;
        this.artistSelector = `${playerBarSelector} [class*=MetadataPosterTitle-title] > a:nth-child(1)`;
        this.volumeSelector = `${playerBarSelector} button[class*=VerticalSlider]`;
        this.progressSelector = `${playerBarSelector} [class^=SeekBar] button`;

        this.resumeButtonSelector = `${playerBarSelector} [data-qa-id="resumeButton"]`;
        this.pauseButtonSelector = `${playerBarSelector} [data-qa-id="pauseButton"]`;
        this.nextButtonSelector = `${playerBarSelector} [data-qa-id="nextButton"]`;
        this.prevButtonSelector = `${playerBarSelector} [data-qa-id="previousButton"]`;

        this.mouseUpEvent = this.createMouseEvent('mouseup');
        this.mouseDownEvent = this.createMouseEvent('mousedown');

        this.playerSelector = playerContainerSelector;
    }

    get playbackStatus() {
        const pauseButton = document.querySelector(this.pauseButtonSelector);
        return Promise.resolve(pauseButton ? 'playing' : 'paused');
    }

    play() {
        this.queryClickWithMouseEvent(this.resumeButtonSelector);
    }

    pause() {
        this.queryClickWithMouseEvent(this.pauseButtonSelector);
    }

    next() {
        this.queryClickWithMouseEvent(this.nextButtonSelector);
    }

    previous() {
        this.queryClickWithMouseEvent(this.prevButtonSelector);
    }

    async queryClickWithMouseEvent(selector) {
        const element = await Utils.query(selector);

        element.dispatchEvent(this.mouseDownEvent);
        element.dispatchEvent(this.mouseUpEvent);
    }

    createMouseEvent(name) {
        /*
         * It's recommended to create mouse events using
         * MouseEvent constructor, but events created
         * in that way aren't triggered in Plex UI.
         */
        const evt = document.createEvent('MouseEvents');
        evt.initMouseEvent(
            name, true, true, window, 0, 0, 0, 0,
            false, false, false, false, 0, null,
        );

        return evt;
    }
}();

connector.start();
