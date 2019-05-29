# How to add support for a website

This document assumes you have basic knowledge in JavaScript and Browser
extensions' API. If you'd like to learn more about the 'Web extensions' API
used by both Chrome and Firefox, please refer to [Mozilla's developer's
documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions).

This document will not attempt to spare you from reading the source code which
it's comments are the most reliable source for documentation. As for adding
a specific website support, refer to
[`content/base-connector.js`](content/base-connector.js) which defines the base
class for every connector in [`connectors/`](connectors/).

Here are the key notes you should consider when attempting to write
a connector:

## Override `get controlsInfo()` according to your connectors capabilities

As it's name may suggest, this method tells the extension what your connector
can do. For example, on YouTube, this needs to be dynamically set - when
watching a video not within a playlist, you shouldn't be able to go the
previous video, meaning `canGoPrevious` should be `false`.

This method is kind of important. It shouldn't break anything if it's not
defined properly but MPRIS clients may check this information so you don't want
them to be mislead.

## Setup an observer in your `constructor()`

In order for your connector to actually do something, it needs to be aware of
certain elements in the web page and watch them. This will hint the connector
to update the status of the playback for example and allow MPRIS clients to
actually control the web page.

It'll be best to read the source code to understand how that works. For some
simple examples, please refer to the following:

- https://github.com/f1u77y/web-media-controller/blob/2413ed404f883955de91a93e1aba32b23289ac41/connectors/invidious.js#L12-L16
- https://github.com/f1u77y/web-media-controller/blob/2413ed404f883955de91a93e1aba32b23289ac41/connectors/jazzradio.js#L18

Trace these functions up to `this.observe` defined in
`content/base-connector.js`
[here](https://github.com/f1u77y/web-media-controller/blob/2413ed404f883955de91a93e1aba32b23289ac41/content/base-connector.js#L236-L252).
