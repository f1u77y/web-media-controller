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
- [Windows appliction](https://github.com/Rubikoid/DesktopPlayer) (has no usage instructions; you probably should build it with MS Visual Studio and edit register by hand for this extension to recognize it)
- Feel free to develop your own tool

## Supported websites
- [VK](https://vk.com)
- [Pandora](https://www.pandora.com/)
- [Deezer](https://deezer.com)
- [listen.moe](https://listen.moe/)
- [YouTube](https://youtube.com)
- [Invidious](https://invidio.us)
- [Google Play Music](https://play.google.com/music)
- [Spotify](https://www.spotify.com/)
- [Yandex.Music](https://music.yandex.ru)
- [Yandex.Radio](https://radio.yandex.ru)

Feel free to request support for any other music website or, even better, provide it yourself.
Unfortunately, there is no documentation for developers, but I'll add it on request.

## Distribution

This project is in testing phase, so I don't distribute it on AMO, Chrome Web Store or
Opera Addons. If you want to test it, you could build the extension and then pack it or
use as temporary extension (warning: temporary extensions are removed at the end of
session in Firefox). It should work on any of latest major browsers: Chromium (Chrome),
Firefox and Opera. Another way to get this extension is GitHub releases. Download the
corresponding file and install the extension from file.

## Building

### Development

For hacking the extension, you'll need [Node.js](https://nodejs.org/) and [npm](http://npmjs.com/)
installed and available in your `$PATH` for building.

    $ npm install
    $ npx grunt build:$browser # $browser could be 'firefox' or 'chrome'

Built extension is now in `build/$browser` directory. You could load it as temporary extension
or pack it.

If you're developer, and you want `build/$browser` directory to correspond the current state of
development, you should run `npx grunt watch:$browser`.

Note that every time you'll restart your browser, it won't load your version of the extension in
`build/$browser`.

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

Alternatively, you can put them in a file inside the extension directory, call this file `amo.json`:

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
