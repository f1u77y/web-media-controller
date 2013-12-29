var VKPC = new function() {

function init() {
  window.addEventListener("load", function load(event) {
    window.removeEventListener("load", load, false);
    injectOnLoad();
  }, false);

  WSClient.go();
}
function extend(dest, source) {
  for (var i in source) {
    dest[i] = source[i];
  }
}
function remove(element) {
  element.parentNode.removeChild(element);
}
function createCData(data) {
  var docu = new DOMParser().parseFromString('<xml></xml>',  "application/xml");
  var cdata = docu.createCDATASection(data);
  docu.getElementsByTagName('xml')[0].appendChild(cdata);
  return cdata;
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
function injectOnLoad() {
  function onPageLoaded(e) {
    var doc = e.originalTarget, loc = doc.location;
    if (!loc.href.match(/^https?:\/\/vk.com\/.*$/)) return;

    doc.addEventListener("VKPCInjectedMessage", function(e) {
      var target = e.target, json = JSON.parse(target.data || "{}"), doc = target.ownerDocument;
      receiveMessage(json, doc, target);
    }, false);

    var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
    loader.loadSubScript("chrome://vkpc/content/inject_on_load.js", doc); 
  }

  var appcontent = document.getElementById("appcontent");
  if (appcontent) {
    appcontent.addEventListener("DOMContentLoaded", onPageLoaded, true);
  }
}
function receiveMessage(json, doc, target) {
  switch (json.cmd) {
  case "register":
    Documents.add(doc);
    break;

  case "params":
    var id = json.id;
    var obj = Injections.get(id);
    if (obj) {
      obj.addResponse(doc, json.data);
    }
    break;
  }

  try {
    remove(target);
  } catch (e) {}
}
function executeCommand(cmd) {
  var injId = Injections.getNextId();

  var tabsCount = Documents.getCount();
  if (!tabsCount) return;

  var injResponses;
  var onDone = function() {
    var ok = {nowPlaying: null, lsSource: null, recentlyPlayed: null, active: null, last: null};
    var results = injResponses.results, lsSource = injResponses.lsSource;
    
    for (var i = 0; i < results.length; i++) {
      var data = results[i].data, doc = results[i].tab;
      ok.last = doc;
      
      if (data.havePlayer && (data.isPlaying || typeof data.trackId == 'string')) {
        ok.recentlyPlayed = doc;
      }
      if (data.isPlaying) {
        ok.nowPlaying = doc;
      }
      if (lsSource && lsSource == data.instanceId) {
        ok.lsSource = doc;
      }
      if (data.isFocused) {
        ok.active = doc;
      }
    }
    injResponses.unregister();

    var rightDoc = ok.nowPlaying || ok.lsSource || ok.recentlyPlayed || ok.active || ok.last;
    if (rightDoc) {
      Documents.sendToDoc(rightDoc, {
        cmd: "audioCommand",
        command: cmd
      });
    }
  };

  injResponses = new InjectionResponses(injId, tabsCount, onDone);
  
  Documents.send({
    cmd: "getParams",
    id: injId
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

var Documents = {
  list: [],
  add: function(doc) {
    this.cleanup();
    this.list.push(doc);
  },
  cleanup: function() {
    this.list = this.list.filter(function(t) {
      return Object.prototype.toString.call(t) != '[object DeadObject]';
    });
  },
  send: function(json) {
    var self = this;
    this.cleanup();

    this.list.forEach(function(doc) {
      self.sendToDoc(doc, json);
    });
  },
  sendToDoc: function(doc, json) {
    var cdata = createCData(JSON.stringify(json));
    doc.getElementById('utils').appendChild(cdata);

    var evt = doc.createEvent("Events");
    evt.initEvent("VKPCBgMessage", true, false);
    cdata.dispatchEvent(evt);    
  },
  getCount: function() {
    this.cleanup();
    return this.list.length;
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

  this.go = function() {
    connect();
  }
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
  addResponse: function(doc, response) {
    this.results.push({tab: doc, data: response});
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

};
