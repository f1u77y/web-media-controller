# Web Media Controller

## Description

Web Media Controller is a browser extension which helps controlling media playback
on various websites with different tools. These tools include but aren't limited to
keyboard shortcuts and desktop widgets. One of these tools is
[wmc-mpris](https://github.com/f1u77y/wmc-mpris). Unfortunately, all these tools
cannot be cross-platform, so this tool works only on desktop GNU/Linux distributions.

It's *completely* unusable without these tools!

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
