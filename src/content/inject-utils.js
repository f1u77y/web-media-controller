import _ from 'underscore';

class PageHelper {
    constructor() {
        this.listeners = new Map();
        this.getters = new Map();
        window.addEventListener('message', ({ data }) => {
            if (data.sender !== 'wmc-connector') {
                return;
            }
            switch (data.type) {
            case 'update-properties':
                this.sendUpdatedProperties(data.propertyNames);
                break;
            case 'setter':
                this.setProperty(data);
                break;
            case 'command':
                this.callCommand(data);
                break;
            }
        });
    }

    async sendUpdatedProperties(propertyNames) {
        const allProperties = await Promise.resolve(propertyNames.map((name) => this[name]));
        const changedProperties = _.object(_.zip(propertyNames, allProperties));
        window.postMessage({
            sender: 'wmc-page',
            type: 'update-notifier',
            changedProperties,
        }, '*');
    }

    setProperty({ property, value }) {
        this[property] = value;
    }

    callCommand({ command, argument }) {
        this[command](argument);
    }

    changeProperties(propertyNames) {
        window.postMessage({ sender: 'wmc-page-notifier', propertyNames }, '*');
    }
}

export { PageHelper };
