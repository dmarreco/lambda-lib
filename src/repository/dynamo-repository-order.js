const AWSXRay = require('aws-xray-sdk');
const _AWS = require('aws-sdk');
const uuid = require('uuid/v4');
const Exceptions = require('./repository-exceptions');
const log = require('../log');
const AWS = (process.env.DISABLE_XRAY == 'true') ? _AWS : AWSXRay.captureAWS(_AWS);
const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * A generic dynamo db repository with basic CRUD operations
 */
class DynamoRepository {

    /**
     * Constructor
     * @param {*} tableName The name of the underlying dynamo table for this instance
     */
    constructor(tableName) {
        if (!tableName) throw new Error('Missing table name to create repository.');
        this._tableName = tableName;
    }

    /**
     * Retrieve all records
     */
    async getAll() {
        var params = {
            TableName: this._tableName
        };

        log.debug('Database scan request', params);
        let response = await dynamoDb.scan(params).promise();
        log.debug('Database scan response', response);
        if (response.Items) {
            return response.Items;
        }
        return [];
    }

    /**
     * Retrieve a record by its primary unique identifier (uuid)
     * @param {*Order's unique universal identifier} uuid 
     */
    async get(uuid) {
        if (!uuid) {
            return Promise.reject(new Exceptions.ParameterMissingException());
        }
        var params = {
            TableName: this._tableName,
            Key: { uuid }
        };
        log.debug('Database get request', params);
        let response = await dynamoDb.get(params).promise();
        log.debug('Database get response', response);
        if (response.Item) {
            return response.Item;
        }
        throw new Exceptions.NoEntityFoundException();
    }

    /**
     * Queries a table and returns a set of matching records
     * @param {*} indexName The name of the table index used in the query
     * @param {*} fieldName The name of the key field
     * @param {*} key The value we are looking for in the key field
     */
    async query(key, fieldName, indexName) {
        if (key == null || fieldName == null) {
            throw new Exceptions.ParameterMissingException('A required parameter is missing for dynamo repository querying');
        }

        var params = {
            TableName: this._tableName,
            IndexName: indexName,
            KeyConditionExpression: '#field = :key',
            ExpressionAttributeNames: { '#field': fieldName },
            ExpressionAttributeValues: { ':key': key },
            ScanIndexForward: false
        };

        if(!indexName) delete params.IndexName;

        log.debug('Database query request', params);
        let response = await dynamoDb.query(params).promise();
        log.debug('Database query response', response);
        return response.Items;
    }

    /**
     * Updates (overwrites) an existing entity by it's primary key (uuid).
     * An entity must have an uuid and a version fields, and the table must have an 'uuid-index'.
     * @param {*} entity new version to be updated.
     * @throws {OptimisticLockException} if the current version is different from the provided entity.
     * @returns {*} The saved entity with the updated version
     */
    async update(entity) {
        if (!(entity.uuid && entity.version)) {
            throw new Exceptions.UnidentifiedEntityException();
        }

        var currentVersion = Number(entity.version);
        var newVersion = Date.now();
        entity.version = newVersion;
        var params = {
            TableName: this._tableName,
            IndexName: 'uuid-index',
            Key: { uuid: entity.uuid },
            Item: entity,
            // the parameters below garantee optimistic lock violations will throw "ConditionalCheckFailedException: The conditional request failed" error
            ConditionExpression: '#version = :currentVersion',
            ExpressionAttributeNames: { '#version': 'version' },
            ExpressionAttributeValues: { ':currentVersion': currentVersion }
        };

        try {
            log.debug('Database put request (update)', params);
            let result = await dynamoDb.put(params).promise();
            log.debug('Database put response (update)', result);
        } catch (error) {
            if (('' + error) === 'ConditionalCheckFailedException: The conditional request failed') {
                log.debug('Database update aborted because concurrency (optimistick lock) conditional check failed', {message: error.message, stack: error.stack});
                throw new Exceptions.OptimisticLockException();
            }
            else
                throw error;
        }

        return entity;
    }

    /**
     * Creates a new entity record in the database and assigns a new uuid (if not provided) and version to it.
     * @param {*} entity The saved entity, with assigned uuid and version.
     */
    async create(entity) {
        if (entity === null || typeof entity !== 'object') {
            throw new Exceptions.InvalidEntityException();
        }

        entity.uuid = entity.uuid || uuid();
        entity.version = Date.now();
        entity.creation = new Date().toISOString();

        var params = {
            TableName: this._tableName,
            Item: entity,
            ReturnValues: 'NONE'
        };

        log.debug('Database put request (create)', params);
        let result = await dynamoDb.put(params).promise();
        log.debug('Database put response (create)', result);

        return entity;
    }

    /**
     * Overwrites or adds some properties to an existing entity
     * 
     * @param {*} uuid The id of the existing entity to be updated
     * @param {*} props The properties to be added/overwriten
     */
    async patch(uuid, props) {
        if (props.uuid && props.uuid !== uuid) {
            throw new Exceptions.BusinessError('Mismatching entity identifiers');
        }
        let entity = await this.get(uuid);
        if(!entity) {
            throw new Exceptions.NoEntityFoundException();
        }
        let newVersion = Object.assign(entity, props);
        return this.update(newVersion);
    }

    async delete(hashKeyName, hashKey, rangeKeyName,  rangeKey) {
        let params = {
            TableName: this._tableName,
            Key: {
                [hashKeyName]: hashKey,
            }
        };

        if (rangeKeyName && rangeKey) {
            params.Key[rangeKeyName] = rangeKey;
        }

        log.debug('Database delete request', params);
        let result = await dynamoDb.delete(params).promise();
        log.debug('Database delete response', result);
    }
}

module.exports = DynamoRepository;
