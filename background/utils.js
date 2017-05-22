'use strict';

define(() => {
    function makeIconPath(name, sizes = [16, 32, 64, 128], extension = 'png') {
        let result = {};
        for (let size of sizes) {
            result[`${size}`] = `icons/${name}-${size}.${extension}`;
        }
        return result;
    }

    function capitalize(s) {
        return s.substr(0, 1).toLocaleUpperCase() + s.substr(1);
    }

    function capitalizeValue({ name, value }) {
        if (typeof value === 'string') {
            value = capitalize(value);
        }
        return { name, value };
    }

    return { makeIconPath, capitalizeValue };
});
