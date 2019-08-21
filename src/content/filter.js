'use strict';

import he from 'he';

class MetadataFilter {
    constructor(filterSet) {
        this.filterSet = filterSet;
    }

    getFilterFor(field) {
        const curFilter = this.filterSet[field] || (x => x);
        const allFilter = this.filterSet['all'] || (x => x);
        return text => allFilter(curFilter(text));
    }

    filter(metadata) {
        let result = {};
        for (let key of Object.keys(metadata)) {
            if (typeof metadata[key] !== 'string') {
                result[key] = metadata[key];
            } else {
                result[key] = this.getFilterFor(key)(metadata[key]);
            }
        }
        return result;
    }

    static combine(...filters) {
        let filterSet = {};
        for (let curFilter of filters) {
            for (let key of Object.keys(curFilter)) {
                if (key in filterSet) {
                    filterSet[key] = text => curFilter(filterSet[key](text));
                } else {
                    filterSet[key] = curFilter;
                }
            }
        }
        return new MetadataFilter(filterSet);
    }

    static trimFilter() {
        return new MetadataFilter({all: text => text.trim()});
    }

    static decodeHTMLFilter() {
        return new MetadataFilter({all: he.decode});
    }
}

export default MetadataFilter;
