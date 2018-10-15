const captureCorrelationIds = require('./capture-correlation-ids');
const flushMetrics = require('./flush-metrics');
const sampleLogging = require('./sample-logging');

module.exports = {
    captureCorrelationIds,
    flushMetrics,
    sampleLogging
};