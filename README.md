# VK Player Controller

Application for GNU/Linux that is DBus MPRIS2 interface for vk.com music service

## Usage

This application is an MPRIS2 interface for vk.com music service. So, you should have
some "Player" widget in your DE/WM/whatever(if you are a Plasma user, you already have
one; don't know about other DE). If you have this widget running, you should be able to
see "VkPC" player. Open your browser with installed extension, open a vk.com tab in it
and try to play some music. It should be controllable with the widget.

If you are standalone WM user, you could bind
```
dbus-send --type=method_call                   \
          --dest='org.mpris.MediaPlayer2.vkpc' \
          /org/mpris/MediaPlayer2              \
          org.mpris.MediaPlayer2.$method_name
```
where `$method_name` could be `PlayPause`, `Play`, `Pause`, `Previous` or `Next`, on some of your media keys.

# Building

## Desktop application

### Dependencies
* glib2
* json-glib
* libsoup

### Building

1. Install dependencies
2. Install development packages(if your distribution needs them)
3. `cd desktop`
4. `make`
5. `make install` if you want to install the binary to `/usr/bin`
6. `make uninstall` if you want to remove the binary from `/usr/bin`

## Extension

### Firefox:
1. Install `web-ext` program
2. `cd extension`
2. Run `web-ext build`
3. Get an account on https://addons.mozilla.org
4. Run `web-ext sign --api-key API_KEY --api-secret API_SECRET`
5. Your built and signed add-on could be found in `./extension/web-ext-artifacts`

### Chrome/Chromium:
1. Go to Developer Mode in chrome://extensions
2. Select "Pack extension"
3. Choose `./extension` as path
4. Your built and signed extension could be found in `./extensions`

### Other browsers
Not supported yet

Alternatively, you can install extensions as temporary
(Note that there is no way to make temporary to be installed persistently on Firefox)

## Install as temporary extension

### Firefox
1. Go to `about:debugging`
2. Select "Load Temporary Add-on"
3. Load it from the `./extension` directory

### Chrome/Chromium
1. Go to Developer Mode in chrome://extensions
2. Select "Load unpacked extension"
3. Choose `./extension` as path
