# Web Media Controller

Allows controlling media player on different sites with Media Player widget on your
desktop

## Usage

This application is a proxy between web media players and Media Player widget from your
desktop environment. If you have this widget running, you should be able to
see "Web Media Controller" player. Open your browser with installed extension,
open a tab with one of supported sited in it
and try to play some music. It should be controllable with the widget.

If you are standalone WM user, you could bind
```
dbus-send --type=method_call                                  \
          --dest='org.mpris.MediaPlayer2.web-media-controller \
          /org/mpris/MediaPlayer2                             \
          org.mpris.MediaPlayer2.$method_name
```
where `$method_name` could be `PlayPause`, `Play`, `Pause`, `Previous` or `Next`, on some of your media keys.

# Prebuilt packages
Not availible yet

# Building

## Desktop application

### Runtime dependencies
* glib2
* json-glib

### Build dependencies
* C compiler which supports GNU extensions (eg. GCC or Clang)
* CMake and its backend (eg. GNU Make)
* `gdbus-codegen` program (part of glib2 package in many distributions)
* Development packages for runtime dependencies

### Building

1. Install dependencies
2. Install development packages(if your distribution needs them)
3. `cd desktop`
4. `mkdir build && cd $_`
5. `cmake .. && make`
4. Use `-DENABLE_$BROWSER=ON` argument to CMake where `$BROWSER` is one of `FIREFOX`, `CHROME` or `CHROMIUM` for installing the manifest for the corresponding browser
5. `make install` if you want to install the program

## Extension

### Firefox:
1. Install `web-ext` program
2. `cd extension`
2. `web-ext build`
3. Get an account on https://addons.mozilla.org
4. `web-ext sign --api-key API_KEY --api-secret API_SECRET`
5. Your built and signed add-on could be found in `./extension/web-ext-artifacts`

### Chrome/Chromium:
1. Go to Developer Mode in chrome://extensions
2. Select "Pack extension"
3. Choose `./extension` as path
4. Your built and signed extension could be found in `./extensions`

### Other browsers
Not supported yet

## Install as temporary extension

### Firefox
(Note that there is no way to make temporary extension to be installed persistently
on Firefox)
1. Go to `about:debugging`
2. Select "Load Temporary Add-on"
3. Load it from the `./extension` directory

### Chrome/Chromium
1. Go to Developer Mode in chrome://extensions
2. Select "Load unpacked extension"
3. Choose `./extension` as path
