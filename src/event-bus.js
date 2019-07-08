const snsClient = require('./client/sns-client');

class EventBus {
    constructor(snsTopicArnPrefix) {
        this._snsTopicArnPrefix = snsTopicArnPrefix;
    }

    async emit(eventName, eventContents) {
        let topicName = `${this._snsTopicArnPrefix}__event__${eventName}`;
        return snsClient.publish(topicName, eventContents);
    }
}

module.exports = EventBus;