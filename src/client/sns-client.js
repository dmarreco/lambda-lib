const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const sns = new AWS.SNS();
const correlationIds = require('../correlation-ids');

const log = require('../log');


function _addCorrelationIds(messageAttributes) {
    let attributes = {};
    let context = correlationIds.get();
    for (let key in context) {
        attributes[key] = {
            DataType: 'String',
            StringValue: context[key]
        };
    }
    return Object.assign(attributes, messageAttributes || {});
}


module.exports.publish = (arn, content, _attributes) => {
    const params = {
        Message: JSON.stringify(content),
        TopicArn: arn,
        MessageAttributes: _addCorrelationIds(_attributes || {})
    };

    log.info('Publishing to SNS topic', params);
    return sns.publish(params).promise();
};