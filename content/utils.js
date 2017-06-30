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

    function parseTime(text, index) {
        let times = text
            .split('/')
            .map(s => s.trim())
            .map(s => s.split(':'))
            .map(s => s.reduce((result, value) => result * 60 + value, 0));
        return times[index] || times[0];
    }

    function parseCurrentTime(text) {
        return parseTime(text, 0);
    }

    function parseLength(text) {
        return parseTime(text, 1);
    }

    function decodeHTMLEntities(text) {
        // <textarea> make XSS impossible
        const textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        return textArea.value;
    }

    return { deepMap, parseCurrentTime, parseLength, decodeHTMLEntities };
})();
