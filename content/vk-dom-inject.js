'use strict';

function last(array) {
    return array[array.length - 1];
}

class VolumeUtil {
    constructor() {
        this.player = window.ap;
        this.e = 35;
    }

    log(num) {
        return (Math.pow(this.e, num) - 1) / (this.e - 1);
    }

    unlog(num) {
        return Math.log(1 + num * (this.e - 1)) / Math.log(this.e);
    }

    set volume(newVolume) {
        this.player.setVolume(this.log(newVolume));
        return newVolume;
    }

    get volume() {
        return this.unlog(this.player.getVolume());
    }
}

class MessageSender {
    constructor() {
        this.sender = 'vkpc-player';
        this.info = {
            artist: 4,
            title: 3,
            length: 5,
            'art-url': 14,
        };
    }

    sendMessage(message) {
        window.postMessage(_(message).extendOwn({ sender: this.sender }), '*');
    }

    sendUpdateEvent(type) {
        const audioObject = window.ap._currentAudio;
        let {currentTime} = window.ap._impl._currentAudioEl || {};
        currentTime = (currentTime || 0) * 1000;
        let trackInfo = {
            artist: audioObject[this.info.artist],
            title: audioObject[this.info.title],
            length: audioObject[this.info.length] * 1000,
        };
        if (audioObject[this.info['art-url']]) {
            trackInfo['art-url'] = last(audioObject[this.info['art-url']].split(','));
        }
        this.sendMessage({ type, trackInfo, currentTime });
    }

    sendPlaybackStatus(status, id) {
        const type = 'get-playback-status';
        this.sendMessage({ type, id, status });
    }

    sendVolume(volume) {
        const type = 'volume';
        this.sendMessage({type, volume});
    }
}

if (!window.vkpcInjected) {
    const volumeUtil = new VolumeUtil();
    const messageSender = new MessageSender();

    window.addEventListener('message', (event) => {
        if (event.data.sender !== 'vkpc-proxy') {
            return;
        }
        let audioElement = window.ap._impl._currentAudioEl;
        switch (event.data.command) {
        case 'play':
            window.ap.play();
            break;
        case 'pause':
            window.ap.pause();
            break;
        case 'play-pause':
            if (window.ap.isPlaying()) {
                window.ap.pause();
            } else {
                window.ap.play();
            }
            break;
        case 'next':
            window.ap.playNext();
            break;
        case 'previous':
            window.ap.playPrev();
            break;
        case 'stop':
            window.ap.stop();
            break;
        case 'seek':
            audioElement.currentTime += event.data.argument / 1000;
            break;
        case 'set-position':
            audioElement.currentTime = event.data.argument / 1000;
            break;
        case 'volume':
            console.log(`volume = ${event.data.argument}`);
            volumeUtil.volume = event.data.argument;
            break;
        case 'reload':
            if (window.ap.isPlaying()) {
                messageSender.sendUpdateEvent('start');
            } else {
                messageSender.sendUpdateEvent('pause');
            }
            break;
        case 'get-playback-status': {
            const status = window.ap.isPlaying() ? 'playing': 'paused';
            messageSender.sendPlaybackStatus(status, event.data.id);
            break;
        }
        }
    });

    messageSender.sendVolume(volumeUtil.volume);

    window.ap.subscribers.push({
        et: 'start',
        cb: () => { messageSender.sendUpdateEvent('play'); }
    });
    window.ap.subscribers.push({
        et: 'pause',
        cb: () => { messageSender.sendUpdateEvent('pause'); }
    });
    window.ap.subscribers.push({
        et: 'stop',
        cb: () => { messageSender.sendUpdateEvent('stop'); }
    });
    window.ap.subscribers.push({
        et: 'volume',
        cb: () => { messageSender.sendVolume(volumeUtil.volume); }
    });
    window.ap.subscribers.push({
        et: 'progress',
        cb: _.throttle(() => {
            messageSender.sendUpdateEvent('progress');
        }, 1000)
    });
    window.vkpcInjected = true;
}
