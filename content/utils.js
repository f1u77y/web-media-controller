'use strict';

/* global chrome */
/* global _ */

_.mixin({
    deepMap: function deepMap(object, f) {
        if (_.isArray(object)) {
            return _(object).map(_.partial(deepMap, _, f));
        } else if (_.isObject(object)) {
            return _(object).mapObject(_.partial(deepMap, _, f));
        } else if (_.isString(object)) {
            return f(object);
        } else {
            return object;
        }
    }
});
