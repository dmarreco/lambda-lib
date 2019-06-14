const { snsClient } = require('./client/sns-client').Client;

exports.emit = async (eventName, eventContents) => {
    let topicName = `${process.env.SNS_TOPIC_ARN_PREFIX}__event__${eventName}`;
    return snsClient.publish(topicName, eventContents);
};