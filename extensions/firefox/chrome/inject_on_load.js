(function() {
  var isFocused = true;

  function vkAudio__getLastInstanceId() {
    var id = null, pp = ls.get('pad_playlist');
    if (pp && pp.source) id = pp.source;
    return id;
  }
  function vkAudio__getParams() {
    var data = {};
    try {
      var havePlayer = window.audioPlayer !== undefined;
      var havePlaylist = havePlayer && !!padAudioPlaylist();

      data = {
        havePlayer: havePlayer,
        havePlaylist: havePlaylist,
        isPlaying: havePlayer && window.audioPlayer.player && !window.audioPlayer.player.paused(),
        instanceId: window.curNotifier && curNotifier.instance_id,
        trackId: havePlayer && audioPlayer.id,
        lastInstanceId: vkAudio__getLastInstanceId()
      };
    } catch(e) {}

    return data;
  }
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

  function createCData(data) {
    var docu = new DOMParser().parseFromString('<xml></xml>',  "application/xml");
    var cdata = docu.createCDATASection(data);
    docu.getElementsByTagName('xml')[0].appendChild(cdata);
    return cdata;
  }
  function sendMessage(json) {
    // Fucking crazy.
    json.bg = 1;

    var cdata = createCData(JSON.stringify(json));
    document.getElementById('utils').appendChild(cdata);

    var evt = document.createEvent("Events");
    evt.initEvent("VKPCInjectedMessage", true, false);
    cdata.dispatchEvent(evt);
  }
  function remove() {
    remove.parentNode.removeChild(remove);
  }
  function receiveCommand(e) {
    var target = e.target, json = JSON.parse(target.data || "{}");

    switch (json.cmd) {
    case "getParams":
      var params = vkAudio__getParams();
      params.isFocused = isFocused;
      sendMessage({
        data: params, 
        cmd: "params",
        id: json.id
      });
      break;

    case "audioCommand":
      switch (json.command) {
      case "play":
      case "pause":
        vkAudio__playPause();
        break;
      
      case "next":
        vkAudio__next();
        break;

      case "prev":
        vkAudio__prev();
        break;
      }
      break;
    }

    try {
      _VKPC.remove(target);
    } catch (e) {}
  }

  window.addEventListener("DOMContentLoaded", function(e) {
    if (window.vk) {
      document.addEventListener("VKPCBgMessage", receiveCommand, false);

      sendMessage({
        cmd: "register"
      });
    }
  });

  window.addEventListener("focus", function(e) {
    isFocused = true;
  }, false);
  window.addEventListener("blur", function(e) {
    isFocused = false
  }, false);
})();
