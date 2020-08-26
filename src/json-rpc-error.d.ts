import { JsonRpcErrorJson } from "./json-rpc-error-json";

export declare class JsonRpcError<Data = any> extends Error
{
    public constructor(
        code? : JsonRpcPredefinedErrorCode | number,
        message? : string | null,
        data? : Data
    );

    public readonly code : number;

    public readonly data : Data;

    public toJson() : JsonRpcErrorJson<Data>;
}

export declare enum JsonRpcPredefinedErrorCode
{
    PARSE_ERROR = -32700,

    INVALID_REQUEST = -32600,

    METHOD_NOT_FOUND = -32601,

    INVALID_PARAMS = -32602,

    INTERNAL_ERROR = -32603,
}
