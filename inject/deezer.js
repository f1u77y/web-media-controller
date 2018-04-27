'use strict';

define([
    'inject/common',
], ({PageHelper}) => {
new class extends PageHelper {
    get album() {
        return window.dzPlayer.getAlbumTitle();
    }

    get uniqueId() {
        return window.dzPlayer.getSongId();
    }

    get canSeek() {
        return window.dzPlayer.control.canSeek();
    }

    set currentTime({ position, length }) {
        window.dzPlayer.control.seek(position / length);
    }

    seek({ offset, position, length }) {
        window.dzPlayer.control.seek((position + offset) / length);
    }

    set volume(volume) {
        window.dzPlayer.control.setVolume(volume);
    }
};
});
