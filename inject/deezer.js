'use strict';

new class extends PageHelper {
    constructor() {
        super();

        if (!this.canStart()) return;
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
