function parseTime(text, index, { useFirstValue = false } = {}) {
    const times = text
        .split('/')
        .map((s) => s.trim())
        .map((s) => s.split(':'))
        .map((s) => s.reduce((result, value) => result * 60 + +value, 0));
    return useFirstValue ? times[0] : times[index];
}

function parseCurrentTime(text, { useFirstValue = false } = {}) {
    return parseTime(text, 0, { useFirstValue });
}

function parseLength(text, { useFirstValue = false } = {}) {
    return parseTime(text, 1, { useFirstValue });
}

/**
    * Extract URL from CSS property.
    * @param  {string} cssProperty CSS property
    * @return {string} Extracted URL
    */
function extractUrlFromCssProperty(cssProperty) {
    const match = /url\((['"]?)(.*)\1\)/.exec(cssProperty);
    if (match) {
        return match[2].trim();
    }
    return null;
}

function extractVideoParameter(key) {
    const params = new URLSearchParams(location.search.substr(1));
    const videoId = params.get(key);
    if (videoId == null) {
        return null;
    }
    return videoId.replace('_', '_u').replace('-', '_d');
}

function $(...args) {
    return document.querySelector(...args);
}

function $$(args) {
    return document.querySelectorAll(...args);
}

export default {
    parseCurrentTime, parseLength,
    $, $$, extractUrlFromCssProperty,
    extractVideoParameter,
};

export { $ };
