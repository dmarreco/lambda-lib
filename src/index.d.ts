export class log {
  static debug: (message: string, params: object) => void;
  static info: (message: string, params: object) => void;
  static warn: (message: string, params: object, error: Error) => void;
  static error: (message: string, params: object, error: Error) => void;
}

export class stringUtil {
  static removeAccents: (value: string) => string;
  static removeNonNumericChars: (value: string) => string;
  static digitsOnly: (value: string) => string;
  static number2currency: (value: number) => string;
  static currency2number: (value: string) => string;
  static minifyString: (value: string) => string;
  static normalizeObjectAttributes: (
    obj: object,
    requiredFieldNames: Array<string>
  ) => string;
  static applyStringExtensions: () => void;
  static isAlphaNumeric: (value: string) => string;
}

export class LambdaEndpoint {
  static Wrap: (lambda: any) => any;
}

export class httpClient {
  static request: (
    verb: string,
    url: string,
    body: object | string,
    headers: object,
    signAws?: boolean
  ) => Promise<object>;
  static awsRequest: (
    verb: string,
    url: string,
    body: object,
    headers: object
  ) => Promise<object>;
}

export class snsClient {
  static publish: (
    arn: string,
    content: object,
    attributes: object
  ) => Promise<object>;
}

export class Client implements LambdaEndpoint, httpClient, snsClient {}

//TODO export class RemoteException
//TODO ClientException: RemoteExceptions.ClientException,
//TODO ServerException: RemoteExceptions.ServerException

//TODO export class HandledException

export class DynamoRepository {
  constructor(tableName: string);
  getAll: () => Promise<Array<object>>;
  get: (uuid: string) => Promise<object>;
  query: (
    key: string | number,
    fieldName: string,
    indexName: string
  ) => Promise<Array<object>>;
  update: (entity: object) => Promise<object>;
  create: (entity: object) => Promise<object>;
  patch: (uuid: string, props: object) => Promise<object>;
  delete: (
    hashKeyName: string,
    hashKey: any | number,
    rangeKeyName: string,
    rangeKey: string | number
  ) => Promise<object>;
}

export function resolveSsmParameter(): Promise<string>;

export class EventBus {
  static emit(eventName: string, eventContents: any): Promise<any>;
}
