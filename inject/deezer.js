'use strict';

/* global listenCommands */

listenCommands([
    ['setPosition', ({ position, length }) => {
        window.dzPlayer.control.seek(position / length);
    }],
    ['seek', ({ offset, position, length }) => {
        window.dzPlayer.control.seek((position + offset) / length);
    }],
    ['setVolume', (volume) => {
        window.dzPlayer.control.setVolume(volume);
    }],
]);
