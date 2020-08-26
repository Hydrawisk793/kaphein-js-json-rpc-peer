import { JsonRpcErrorJson } from "./json-rpc-error-json";

export declare interface JsonRpcErrorResponseJson<ErrorJson extends JsonRpcErrorJson<any> = JsonRpcErrorJson<any>>
{
    jsonrpc : string;

    error : ErrorJson;

    id : string | number | null;
}
