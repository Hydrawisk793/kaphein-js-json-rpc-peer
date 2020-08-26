export declare interface JsonRpcRequestJson<Params = any>
{
    jsonrpc : string;

    method : string;

    params? : Params;

    id : string | number;
}
