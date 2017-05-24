'use strict';

/* global listenCommands */
/* global addGetter      */

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

addGetter('album', () => window.dzPlayer.getAlbumTitle());
addGetter('songId', () => window.dzPlayer.getSongId());
