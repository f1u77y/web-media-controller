'use strict';

/* global PageHelper */

(new class extends PageHelper {
    start() {
        if (!this.canStart) return;

        this.addListener('setPosition', ({ position, length }) => {
            window.dzPlayer.control.seek(position / length);
        });
        this.addListener('seek', ({ offset, position, length }) => {
            window.dzPlayer.control.seek((position + offset) / length);
        });
        this.addListener('setVolume', (volume) => {
            window.dzPlayer.control.setVolume(volume);
        });

        this.addGetter('album', () => window.dzPlayer.getAlbumTitle());
        this.addGetter('songId', () => window.dzPlayer.getSongId());
        this.addGetter('canSeek', () => window.dzPlayer.control.canSeek());
    }
}).start();
