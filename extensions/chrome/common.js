function init() {
  // receive messages from webpage
  chrome.runtime.onMessageExternal.addListener(receiveMessage);
}
function receiveMessage(msg, sender, sendResponse) {
  if (msg.cmd == "injection_result") {
    var obj = Injections.get(msg.id);
    if (obj) obj.addResponse(sender.tab.id, msg.data);
  }
}
function extend(dest, source) {
  for (var i in source) {
    dest[i] = source[i];
  }
}
function getWebSocket() {
  return window.WebSocket || window.MozWebSocket;
}
function print() {
  var msgs = [], i, tmp;
  for (i = 0; i < arguments.length; i++) {
    if (arguments[i] instanceof Error) tmp = [arguments[i], arguments[i].stack];
    else tmp = arguments[i];
    msgs.push(tmp);
  }

  try {
    console.log.apply(console, msgs);
  } catch(e) {}
}
function getExtensionId() {
  return chrome.i18n.getMessage("@@extension_id");
}
function getVKTabs(callback) {
  var vkTabs = [];
  chrome.tabs.query({}, function(tabs) {
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (tab.url.match(new RegExp('https?://vk.com/.*', 'gi'))) {
        vkTabs.push(tab);
      }
    }
    callback(vkTabs);
  });
}
function executeCommand(cmd) {
  var injId = Injections.getNextId();
  var code_inj = "var el = document.createElement('script'); el.src = chrome.extension.getURL('inject_and_return.js'); document.body.appendChild(el); var el1 = document.createElement('script'); el1.textContent = 'window.__vkpc_extid=\""+getExtensionId()+"\"; window.__vkpc_injid="+injId+"'; document.body.appendChild(el1)";
  var code_exec = "var el = document.createElement('script'); el.src = chrome.extension.getURL('inject_exec.js'); document.body.appendChild(el); var el1 = document.createElement('script'); el1.textContent = 'window.__vkpc_cmd=\""+cmd+"\"'; document.body.appendChild(el1)";

  getVKTabs(function(tabs) {
    if (!tabs.length) return;

    var injResponses, activeTabId = null;
    var onDone = function() {
      var ok = {nowPlaying: null, lsSource: null, recentlyPlayed: null, active: activeTabId, last: null};
      var results = injResponses.results, lsSource = injResponses.lsSource;
      
      for (var i = 0; i < results.length; i++) {
        var data = results[i].data, id = results[i].tab;
        ok.last = id;
        
        if (data.havePlayer && (data.isPlaying || typeof data.trackId == 'string')) {
          ok.recentlyPlayed = id;
        }
        if (data.isPlaying) {
          ok.nowPlaying = id;
        }
        if (lsSource && lsSource == data.instanceId) {
          ok.lsSource = id;
        }
      }
      injResponses.unregister();

      var rightId = ok.nowPlaying || ok.lsSource || ok.recentlyPlayed || ok.active || ok.last;
      if (rightId) {
        chrome.tabs.executeScript(rightId, {code: code_exec});
      }
    };
    injResponses = new InjectionResponses(injId, tabs.length, onDone);

    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].active) activeTabId = tabs[i].id;
      chrome.tabs.executeScript(tabs[i].id, {
        code: code_inj
      });
    }
  });
}

var Injections = {
  id: 0,
  objs: {},
  getNextId: function() {
    return ++this.id;
  },
  get: function(id) {
    return this.objs[id] || false;
  },
  register: function(id, obj) {
    this.objs[id] = obj;
  },
  unregister: function(id) {
    if (this.objs[id] !== undefined) delete this.objs[id];
  }
};

var WSClient = new function() {
  var STATUS_NONE = 0, STATUS_OK = 1, STATUS_ERR = 2;
  var _ws = getWebSocket(), ws;
  var _status = STATUS_NONE; 
  var ping_timer, reconnect_timer;

  if (!_ws) return;

  function setTimers() {
    ping_timer = setInterval(function() {
      if (ws) ws.send("PING");
    }, 30000);
  }
  function unsetTimers() {
    clearInterval(ping_timer);
  }

  function connect() {
    _status = STATUS_NONE;

    print("[connect]");
    ws = new _ws("ws://localhost:52178", "signaling-protocol");
    ws.onopen = function() {
      _status = STATUS_OK;
      setTimers();
    };
    ws.onerror = function() {
      unsetTimers();
      if (_status != STATUS_ERR) {
        _status = STATUS_ERR;
        tryToReconnect();
      }
    }
    ws.onclose = function() {
      unsetTimers();
      if (_status != STATUS_ERR) {
        _status = STATUS_ERR;
        tryToReconnect();
      }
    };
    ws.onmessage = function(e) {
      onCommand(e.data);
    };
  }
  function tryToReconnect() {
    print("[tryToReconnect]");

    clearTimeout(reconnect_timer);
    reconnect_timer = setTimeout(connect, 5000);
  }
  function onCommand(msg) {
    executeCommand(msg);
  }

  connect();
};

function InjectionResponses(id, count, callback) {
  this.id = id;
  this.results = [];
  this.lsSource = null;
  this.maxCount = count;
  this.callback = callback || function() {};

  Injections.register(this.id, this);
}
extend(InjectionResponses.prototype, {
  addResponse: function(id, response) {
    this.results.push({tab: id, data: response});
    if (!this.lsSource && response && response.lastInstanceId) this.lsSource = response.lastInstanceId;
    if (this.results.length == this.maxCount) {
      this.callback();
    }
  },
  unregister: function() {
    Injections.unregister(this.id);
  }
});

init();
