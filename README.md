# Web Media Controller

## Description

Web Media Controller is a browser extension which helps controlling media playback
on various websites with different tools. These tools include but aren't limited to
keyboard shortcuts and desktop widgets. One of these tools is
[wmc-mpris](https://github.com/f1u77y/wmc-mpris). Unfortunately, all these tools
cannot be cross-platform, so this tool works only on desktop GNU/Linux distributions.

It's *completely* unusable without these tools!

## Usage
Install this extension and one of those tools. Usage instructions are different for each
of them, so consider reading tools' docs. Usually they're desktop widgets or daemons that interact with
other desktop widgets or provide keyboard-only control themselves.

## Tools
- [wmc-mpris](https://github.com/f1u77y/wmc-mpris) (Works on GNU/Linux and should work on BSD)
- [WebNowPlaying](https://github.com/tjhrulz/WebNowPlaying) (Rainmeter plugin; works on Windows)
- Feel free to develop your own tool

## Supported websites
- [VK](https://vk.com)
- [Pandora](https://www.pandora.com/)
- [Deezer](https://deezer.com)
- [listen.moe](https://listen.moe/)
- [YouTube](https://youtube.com)
- [Invidious](https://invidio.us)
- [JAZZRADIO](https://jazzradio.com)
- [ClassicalRadio](https://classicalradio.com)
- [RadioTunes](https://radiotunes.com)
- [RockRadio](https://www.rockradio.com)
- [Google Play Music](https://play.google.com/music)
- [Spotify](https://www.spotify.com/)
- [Yandex.Music](https://music.yandex.ru)
- [Yandex.Radio](https://radio.yandex.ru)
- [SoundCloud](https://soundcloud.com)

Feel free to request support for any other music website or, even better,
provide it yourself. See [this documentation](CONTRIBUTING.md) for learning the
basic of writing a connector for a specific website.

## Distribution

This project is distributed on [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/web-media-controller/).
I'll add it to Chrome Web Store (and maybe Opera add-ons, if it's compatible) on request.
You could also get Firefox and Chrome extension from GitHub releases.

Another way to use the extension is to build the extension and then pack it or
use as temporary extension (warning: temporary extensions are removed at the end of
session in Firefox). It should work on any of latest major browsers: Chromium (Chrome),
Firefox and Opera.

## Building

### Development

For hacking the extension, you'll need [Node.js](https://nodejs.org/) and [npm](http://npmjs.com/)
installed and available in your `$PATH` for building.

    $ npm install
    $ npx grunt build:$browser # $browser could be 'firefox' or 'chrome'

The extension is now built in `build/$browser/`. You could load it as temporary extension
or pack it.

If you're developer, and you want `build/$browser/` to correspond the current state of
development, you should run `npx grunt watch:$browser`.

Note that every time you'll restart your browser, it won't load your version of the extension in
`build/$browser/`.

### Packing

If you want to pack the extension for permanent use, you will need to sign it. For every browser
the instructions are a little bit different.

#### Firefox

For packing the extension for Firefox, you'll need an API key and API secret from Mozilla, You can
get them via [this interface](https://addons.mozilla.org/en-US/developers/addon/api/key/).

After you'll get your credentials, you can either put them in the following environmental variables,
as suggested [here](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/web-ext_command_reference#web-ext_sign):

```sh
export WEB_EXT_API_KEY=<your apiKey>
export WEB_EXT_API_SECRET=<your apiSecret>
```

Alternatively, you can put them in a file inside the extension directory, call this file `./.amo.json`:

```json
{
  "apiKey": "<your apiKey>",
  "apiSecret": "<your apiSecret>"
}
```

Firefox doesn't allow to sign an extension that is owned by someone else currently [@f1u77y](https://github.com/f1u77y)
so you will need to change the ID of it specified in the file `firefox_manifest.json`. For example:

```json
{
    "applications": {
        "gecko": {
            "id": "web-media-controller@bobross.com",
            "strict_min_version": "48.0"
        }
    },

    "options_ui.browser_style": true
}
```

NOTE: Since you probably use this along with [wmc-mpris](https://github.com/f1u77y/wmc-mpris), you will need to change
the id of the extension as specified in the native-messaging JSON file as well before building and installing it. Firefox'
file is named [`me.f1u77y.web_media_controller.firefox.json`](https://github.com/f1u77y/wmc-mpris/blob/master/me.f1u77y.web_media_controller.firefox.json).
According to our example above, the file should look like this:

```json
{
    "name": "me.f1u77y.web_media_controller",
    "description": "Allows controlling VK player via MPRIS",
    "path": "@EXECUTABLE_PATH@",
    "type": "stdio",
    "allowed_extensions": [
        "web-media-controller@bobross.com"
    ]
}
```

Don't forget to manually rebuild [wmc-mpris](https://github.com/f1u77y/wmc-mpris) or alternatively put a file equivalent
to the one showen above in `~/.mozilla/native-messaging-hosts/`.

In order to finally build and sign the extension, run:

```
npx grunt webext_builder:firefox
```

#### Chrome

Very much like Firefox, Chrome also requests developers to sign their packages. You can either use
Chrome's GUI to pack the extension or using the development environment to do so. In any case, you
will need to create a private key with the following command:

```
openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt > ./.cws.private.pem
# recommended
chmod og-r ./.cws.private.pem
```

Finally packing the extension with Chrome's GUI can be done using the `./.cws.private.pem` you've just
generated or with a private key Chrome will generate by itself. See this [stack overflow question](https://stackoverflow.com/questions/37317779/making-a-unique-extension-id-and-key-for-chrome-extension)
for more details.
