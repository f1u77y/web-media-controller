(function() {
  function getLastInstanceId() {
    var id = null, pp = ls.get('pad_playlist');
    if (pp && pp.source) id = pp.source;
    return id;
  }

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
      lastInstanceId: getLastInstanceId()
    };
  } catch(e) {}

  chrome.runtime.sendMessage(window.__vkpc_extid, {
    cmd: "injection_result",
    id: parseInt(window.__vkpc_injid, 10),
    data: data
  });
})();
