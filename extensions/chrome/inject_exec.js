(function() {
  function vkAudio__getPlayFirstId() {
    var id = currentAudioId() || ls.get('audio_id') || (window.audioPlaylist && audioPlaylist.start);
    return id || null;
  }
  function vkAudio__executeAfterPadLoading(f) {
    Pads.show('mus');
    window.onPlaylistLoaded = function() {
      if (f) {
        try {
          f();
        } catch(e) {}
      }
      setTimeout(function() {
        Pads.show('mus');
      }, 10);
    }
  }
  function vkAudio__next() {
    console.log("Next");
    window.audioPlayer && audioPlayer.nextTrack(true, !window.audioPlaylist);
  }
  function vkAudio__prev() {
    console.log("Prev");
    window.audioPlayer && audioPlayer.prevTrack(true, !window.audioPlaylist);
  }
  function vkAudio__playPause() {
    console.log("PlayPause");
    if (!window.audioPlayer || !padAudioPlaylist()) {
      stManager.add(['audioplayer.js'], function() {
        vkAudio__executeAfterPadLoading(function() {
          var plist = padAudioPlaylist(), id = vkAudio__getPlayFirstId();
          if (id) {
            playAudioNew(id);
          } else if (plist && plist.start) {
            playAudioNew(plist.start);
          }
        });
      });
    } else {
      if (window.audioPlayer && audioPlayer.player) {
        if (audioPlayer.player.paused()) {
          audioPlayer.playTrack(); 
        } else {
          audioPlayer.pauseTrack();
        }
      }
    }
  }

  try {
    var data = window.__vkpc_cmd;
    if (data) {
      switch (data) {
      case "next":
        vkAudio__next();
        break;

      case "prev":
        vkAudio__prev();
        break;

      case "play":
      case "pause":
        vkAudio__playPause();
        break;
      }

      delete window.__vkpc_cmd;
    }
  } catch (e) {
    console.log('[VKPC]', e, e.stack);
  }
})();
