'use strict';

(new class extends PageHelper {
    start() {
        if (!this.canStart()) return;

        this.addListener('set currentTime', ({ position, length }) => {
            window.dzPlayer.control.seek(position / length);
        });
        this.addListener('seek', ({ offset, position, length }) => {
            window.dzPlayer.control.seek((position + offset) / length);
        });
        this.addListener('set volume', (volume) => {
            window.dzPlayer.control.setVolume(volume);
        });

        this.addGetter('album', () => window.dzPlayer.getAlbumTitle());
        this.addGetter('uniqueId', () => window.dzPlayer.getSongId());
        this.addGetter('canSeek', () => window.dzPlayer.control.canSeek());
    }
}).start();
