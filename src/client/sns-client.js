const correlationIds = require('../correlation-ids');
const log = require('../log');
const AWS = require('aws-sdk');

const DEFAULT_REGION = 'us-west-2';

function getAwsSnsLib(region = DEFAULT_REGION) {
    return new AWS.SNS({ region });
}

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

function _getRegionFromArn(arn) {
    const arnParts = arn.split(':');
    return arnParts[3];
}


module.exports.publish = (arn, content, _attributes) => {
    const params = {
        Message: JSON.stringify(content),
        TopicArn: arn,
        MessageAttributes: _addCorrelationIds(_attributes || {})
    };

    log.info('Publishing to SNS topic', params);
    const region = _getRegionFromArn(arn);
    return getAwsSnsLib(region).publish(params).promise();
};

module.exports.send = (phone, content, _attributes) => {
    const params = {
        Message: content,
        PhoneNumber: phone,
        MessageAttributes: _addCorrelationIds(_attributes || {})
    };

    log.info('Sending SMS message', params);
    return getAwsSnsLib().publish(params).promise();
};