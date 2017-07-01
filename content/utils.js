'use strict';

/* exported Utils */

const Utils = (() => {
    function deepMap(object, f) {
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

    function parseTime(text, index, { useFirstValue = false } = {}) {
        let times = text
            .split('/')
            .map(s => s.trim())
            .map(s => s.split(':'))
            .map(s => s.reduce((result, value) => result * 60 + (+value), 0));
        return useFirstValue ? times[0] : times[index];
    }

    function parseCurrentTime(text, { useFirstValue = false } = {}) {
        return parseTime(text, 0, { useFirstValue });
    }

    function parseLength(text, { useFirstValue = false } = {}) {
        return parseTime(text, 1, { useFirstValue });
    }

    return { deepMap, parseCurrentTime, parseLength };
})();
