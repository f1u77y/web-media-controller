'use strict';

/* global sendToConnector */
/* global listenCommands  */
/* global addGetter       */

(() => {
    if (window.wmcInjected) {
        return;
    }
    const e = 35;

    let playbackStatus = 'stopped';

    function logVolume(num) {
        return (Math.pow(e, num) - 1) / (e - 1);
    }

    function unlogVolume(num) {
        return Math.log(1 + num * (e - 1)) / Math.log(e);
    }

    function setVolume(volume) {
        window.ap.setVolume(logVolume(volume));
    }

    function getVolume() {
        return unlogVolume(window.ap.getVolume());
    }

    function getAudioElement() {
        return window.ap._impl._currentAudioEl || {};
    }

    function getTrackInfo() {
        function last(array) {
            return array[array.length - 1];
        }

        const infoIndex = {
            artist: 4,
            title: 3,
            length: 5,
            artUrl: 14,
        };
        const audioObject = window.ap._currentAudio;
        let trackInfo = {
            artist: audioObject[infoIndex.artist],
            title: audioObject[infoIndex.title],
            length: audioObject[infoIndex.length] * 1000,
        };
        if (audioObject[infoIndex.artUrl]) {
            trackInfo.artUrl = last(audioObject[infoIndex.artUrl].split(','));
        }
        return trackInfo;
    }

    function getCurrentTime() {
        let {currentTime} = getAudioElement();
        currentTime = (currentTime || 0) * 1000;
        return currentTime;
    }

    function sendEventToConnector(event) {
        let volume = null;
        let trackInfo = getTrackInfo();
        let currentTime = getCurrentTime();
        let newPlaybackStatus = null;
        switch (event) {
        case 'start':
            newPlaybackStatus = 'playing';
            break;
        case 'stop':
            newPlaybackStatus = 'stopped';
            break;
        case 'pause':
            newPlaybackStatus = 'paused';
            break;
        case 'volume':
            volume = getVolume();
            break;
        }
        if (newPlaybackStatus) {
            playbackStatus = newPlaybackStatus;
        }
        sendToConnector({ volume, playbackStatus, trackInfo, currentTime });
    }

    listenCommands([
        ['play', () => window.ap.play()],
        ['pause', () => window.ap.pause()],
        ['playPause', () => window.ap.isPlaying() ? window.ap.pause() : window.ap.play()],
        ['stop', () => window.ap.stop()],
        ['next', () => window.ap.playNext()],
        ['previous', () => window.ap.playPrev()],
        ['seek', (offset) => {
            getAudioElement().currentTime += offset / 1000;
        }],
        ['setPosition', position => {
            getAudioElement().currentTime = position / 1000;
        }],
        ['setVolume', (volume) => setVolume(volume) ],
    ]);

    addGetter('playbackStatus', () => playbackStatus);
    addGetter('volume', getVolume);
    addGetter('trackInfo', getTrackInfo);
    addGetter('currentTime', getCurrentTime);
    addGetter('songId', () => window.ap.getCurrentAudio()[0]);

    sendToConnector('volume', getVolume());

    for (let event of ['start', 'pause', 'stop', 'volume', 'progress']) {
        const ev = event;
        window.ap.subscribers.push({
            et: ev,
            cb: () => sendEventToConnector(ev),
        });
    }
    window.wmcInjected = true;
})();
