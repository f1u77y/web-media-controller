'use strict';

class PageHelper {
    constructor() {
        this.listeners = new Map();
        this.getters = new Map();
        window.addEventListener('message', ({ data: { sender, command, property, argument, id } }) => {
            switch (sender) {
            case 'wmc-connector-getter':
                Promise.resolve(this[property]).then(value => {
                    window.postMessage({
                        sender: 'wmc-page-getter',
                        response: value,
                        property, id,
                    }, '*');
                });
                break;
            case 'wmc-connector-setter':
                this[property] = argument;
                break;
            case 'wmc-connector-command':
                this[command](argument);
                break;
            }

        });
    }

    changeProperties(propertyNames) {
        window.postMessage(({ sender: 'wmc-page-notifier', propertyNames }), '*');
    }
}

export { PageHelper };
