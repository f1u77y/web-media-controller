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
