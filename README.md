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

You should have node.js installed and availible in your `$PATH` for building.

    $ npm install
    $ npx grunt build

Built extension is now in `build/` directory. You could load it as temporary extension
or pack it.

If you're developer, and you want `build/` directory to correspond the current state of
development, you should run `npx grunt watch`.
