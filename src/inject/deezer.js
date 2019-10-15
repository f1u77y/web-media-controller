import { PageHelper } from 'content/inject-utils';

new class extends PageHelper {
    play() {
        window.dzPlayer.control.play();
    }

    pause() {
        window.dzPlayer.control.pause();
    }

    playPause() {
        window.dzPlayer.control.togglePause();
    }

    get playbackStatus() {
        if (window.dzPlayer.isPlaying()) {
            return 'playing';
        } else if (window.dzPlayer.isPaused()) {
            return 'paused';
        } else {
            return 'stopped';
        }
    }

    next() {
        window.dzPlayer.control.nextSong();
    }

    previous() {
        window.dzPlayer.control.prevSong();
    }

    get trackInfo() {
        const artHash = window.dzPlayer.getCover();
        return {
            artist: window.dzPlayer.getArtistName(),
            title: window.dzPlayer.getSongTitle(),
            album: window.dzPlayer.getAlbumTitle(),
            artUrl: `https://e-cdns-images.dzcdn.net/images/cover/${artHash}/500x500-000000-80-0-0.jpg`,
            length: this.length,
        };
    }

    get length() {
        return window.dzPlayer.getDuration() * 1000;
    }

    get currentTime() {
        return Math.floor((window.dzPlayer.getDuration() - window.dzPlayer.getRemainingTime()) * 1000);
    }

    set currentTime(position) {
        window.dzPlayer.control.seek(position / this.length);
    }

    get canSeek() {
        return window.dzPlayer.control.canSeek();
    }

    seek(offset) {
        window.dzPlayer.control.seek((this.currentTime + offset) / this.length);
    }

    get volume() {
        return window.dzPlayer.getVolume();
    }

    set volume(volume) {
        window.dzPlayer.control.setVolume(volume);
    }
}();
