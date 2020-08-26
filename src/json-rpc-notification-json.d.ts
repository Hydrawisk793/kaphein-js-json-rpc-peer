export declare interface JsonRpcNotificationJson<Params = any>
{
    jsonrpc : string;

    method : string;

    params? : Params;
}
