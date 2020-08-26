export declare interface JsonRpcSuccessfulResponseJson<Result = any>
{
    jsonrpc : string;

    result : Result;

    id : string | number;
}
