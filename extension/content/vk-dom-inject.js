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

function getAudioElement() {
    return window.ap._impl._currentAudioEl || {};
}

function getTrackInfo() {
    const infoIndex = {
        artist: 4,
        title: 3,
        length: 5,
        'art-url': 14
    };
    const audioObject = window.ap._currentAudio;
    let trackInfo = {
        artist: audioObject[infoIndex.artist],
        title: audioObject[infoIndex.title],
        length: audioObject[infoIndex.length] * 1000
    };
    if (audioObject[infoIndex['art-url']]) {
        trackInfo['art-url'] = last(audioObject[infoIndex['art-url']].split(','));
    }
    return trackInfo;
}

class MessageSender {
    constructor() {
        this.sender = 'vkpc-player';
    }

    sendMessage(message) {
        window.postMessage(_(message).extendOwn({ sender: this.sender }), '*');
    }

    sendUpdateEvent(type) {
        let {currentTime} = getAudioElement();
        currentTime = (currentTime || 0) * 1000;
        this.sendMessage({ type, trackInfo: getTrackInfo(), currentTime });
    }

    sendVolume(volume) {
        const type = 'volume';
        this.sendMessage({type, volume});
    }
}

class PropertyGetters {
    constructor() {
        this.getters = new Map();
    }

    addGetter(property, func) {
        function sendResponse({data}) {
            if (data.sender   !== 'vkpc-proxy'    ||
                data.command  !== 'get-from-page' ||
                data.property !== property        )
            {
                return;
            }
            window.postMessage({
                sender: 'vkpc-player',
                type: data.command,
                property: data.property,
                id: data.id,
                response: func()
            }, '*');
        }
        this.getters.set(property, sendResponse);
        window.addEventListener('message', sendResponse);
    }

    removeGetter(property) {
        window.removeEventListener('message', this.getters.get(property));
        this.getters.delete(property);
    }
}

const volumeUtil = new VolumeUtil();
const messageSender = new MessageSender();
const propertyGetters = new PropertyGetters();

class Command {
    constructor(command, argument) {
        this.command = command;
        this.argument = argument;
    }

    run() {
        (Command.functions.get(this.command) || (() => {}))(this.argument);
    }
}

Command.functions = new Map([
    ['play', () => window.ap.play()],
    ['pause', () => window.ap.pause()],
    ['play-pause', () => window.ap.isPlaying() ? window.ap.pause() : window.ap.play()],
    ['stop', () => window.ap.stop()],
    ['next', () => window.ap.playNext()],
    ['previous', () => window.ap.playPrev()],
    ['seek', (offset_us) => {
        getAudioElement().currentTime += offset_us / 1000000;
    }],
    ['set-position', (position_us) => {
        getAudioElement().currentTime = position_us / 1000000;
    }],
    ['volume', (volume) => volumeUtil.volume = volume]
]);

if (!window.vkpcInjected) {
    propertyGetters.addGetter('playback-status', () => {
        if (window.ap._impl._currentAudioEl.src === window.AudioPlayerHTML5.SILENCE ||
            window.ap._impl._currentAudioEl.src === ''                              )
        {
            return 'stopped';
        }
        return window.ap.isPlaying() ? 'playing' : 'paused';
    });
    propertyGetters.addGetter('volume', () => {
        return volumeUtil.volume;
    });
    propertyGetters.addGetter('track-info', () => {
        return getTrackInfo();
    });

    window.addEventListener('message', ({data}) => {
        if (data.sender !== 'vkpc-proxy') {
            return;
        }
        new Command(data.command, data.argument).run();
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
