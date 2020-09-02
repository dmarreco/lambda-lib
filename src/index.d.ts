export interface log {
    debug: (message: string, params: object) =>  void
    info: (message: string, params: object) =>  void
    warn: (message: string, params: object, error: Error) =>  void
    error: (message: string, params: object, error: Error) =>  void
}

export interface stringUtil {
    removeAccents: (value: string) => string
    removeNonNumericChars: (value: string) => string
    digitsOnly: (value: string) => string
    number2currency: (value: number) => string
    currency2number: (value: string) => string
    minifyString: (value: string) => string
    normalizeObjectAttributes: (obj: object, requiredFieldNames: Array<string>) => string
    applyStringExtensions: () => void
    isAlphaNumeric: (value: string) => string
}

export class LambdaEndpoint {
    static Wrap: (lambda: any) => any
} 

export interface httpClient {
    request: (verb: string, url: string, body: object | string, headers: object, signAws: boolean) => Promise<object>,
    awsRequest: (verb: string, url: string, body: object, headers: object) => Promise<object>
}


export interface snsClient {
    publish: (arn: string, content: object, attributes: object) => Promise<object>
}

export interface Client extends LambdaEndpoint, httpClient, snsClient {
}

//TODO export class RemoteException
//TODO ClientException: RemoteExceptions.ClientException,
//TODO ServerException: RemoteExceptions.ServerException


//TODO export class HandledException

export class DynamoRepository {
    constructor(tableName: string)
    getAll: () => Promise<Array<object>>
    get: (uuid: string) => Promise<object>
    query: (key: string | number, fieldName: string, indexName: string) => Promise<Array<object>>
    update: (entity: object) => Promise<object>
    create: (entity: object) => Promise<object>
    patch: (uuid: string, props: object) => Promise<object>
    delete: (hashKeyName: string, hashKey: any | number, rangeKeyName: string,  rangeKey: string | number) => Promise<object>
}

export function resolveSsmParameter(): Promise<string>;

export interface EventBus {
    emit(eventName: string, eventContents: any): Promise<any>
}