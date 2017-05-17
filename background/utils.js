'use strict';

define(() => {
    function makeIconPath(name, sizes = [16, 32, 64, 128], extension = 'png') {
        let result = {};
        for (let size of sizes) {
            result[`${size}`] = `icons/${name}-${size}.${extension}`;
        }
        return result;
    }

    return { makeIconPath };
});
