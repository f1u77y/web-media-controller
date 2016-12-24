'use strict';

if (!window.vkpcInjected) {
    const sendUpdateEvent = (type) => {
		    const {currentTime} = window.ap._impl._currentAudioEl || {};
		    const {performer, title, duration, url} = window.audio || {};
		    window.postMessage({
			      sender: 'vkpc-player',
			      type,
			      trackInfo: {
					      artist: performer,
					      title: title,
				        length: duration * 1000,
                url,
			      },
            currentTime: (currentTime || 0) * 1000,
		    }, '*');
    };

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
        }
    });

    for (let event of ['start', 'progress', 'pause', 'stop']) {
        window.ap.subscribers.push({
            et: event,
            cb: sendUpdateEvent.bind(null, event),
        });
    }
    window.vkpcInjected = true;
}
