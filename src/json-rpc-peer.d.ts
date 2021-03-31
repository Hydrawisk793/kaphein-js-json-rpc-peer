import { EventListenable } from "kaphein-js-event-emitter";

import { JsonRpcRequestJson } from "./json-rpc-request-json";
import { JsonRpcSuccessfulResponseJson } from "./json-rpc-successful-response-json";
import { JsonRpcErrorResponseJson } from "./json-rpc-error-response-json";
import { JsonRpcErrorJson } from "./json-rpc-error-json";

export declare class JsonRpcPeer implements EventListenable<JsonRpcPeerEventListenerMap>
{
    public constructor();

    public addListener<K extends keyof JsonRpcPeerEventListenerMap>(
        eventName : K,
        listener : JsonRpcPeerEventListenerMap[K]
    ) : this;

    public removeListener<K extends keyof JsonRpcPeerEventListenerMap>(
        eventName : K,
        listener : JsonRpcPeerEventListenerMap[K]
    ) : this;

    public on<K extends keyof JsonRpcPeerEventListenerMap>(
        eventName : K,
        listener : JsonRpcPeerEventListenerMap[K]
    ) : this;

    public once<K extends keyof JsonRpcPeerEventListenerMap>(
        eventName : K,
        listener : JsonRpcPeerEventListenerMap[K]
    ) : this;

    public off<K extends keyof JsonRpcPeerEventListenerMap>(
        eventName : K,
        listener : JsonRpcPeerEventListenerMap[K]
    ) : this;

    public getState() : JsonRpcPeerState;

    public open(
        url : string,
        option? : {
            WebSocket : typeof WebSocket;
        }
    ) : Promise<void>;

    public open(
        ws : WebSocket,
        ownsSocket? : boolean
    ) : Promise<void>;

    public close() : Promise<void>;

    public getSocketClient() : WebSocket | null;

    public getHandlerDefaultContext() : any;

    public setHandlerDefaultContext(
        context? : any
    ) : void;

    public setDefaultRpcHandler(
        handler : JsonRpcFunction
    ) : void;

    public getRpcHandler(
        method : string
    ) : JsonRpcFunction | null;

    public setRpcHandler(
        method : string,
        handler : JsonRpcFunction
    ) : void;

    public removeRpcHandler(
        method : string
    ) : void;

    public setNonJsonRpcMessageHandler(
        handler : JsonRpcNonJsonRpcMessageHandler
    ) : void;

    public setNonJsonMessageHandler(
        handler : JsonRpcNonJsonMessageHandler
    ) : void;

    public request(
        request : Omit<JsonRpcRequestJson<any>, "jsonrpc">,
        option? : JsonRpcRequestOption
    ) : Promise<JsonRpcRequestReturnValue> | void;

    public request(
        requests : Omit<JsonRpcRequestJson<any>, "jsonrpc">[],
        option? : JsonRpcRequestOption
    ) : Promise<JsonRpcRequestReturnValue[]>;
}

export declare type JsonRpcFunction = (
    context : any,
    req : JsonRpcRequestJson<any>
) => Promise<any>;

export declare type JsonRpcNonJsonRpcMessageHandler = (
    context : any,
    message : any
) => void | Promise<void>;

export declare type JsonRpcNonJsonMessageHandler = (
    context : any,
    message : any
) => void | Promise<void>;

export declare type JsonRpcRequestReturnValue =
    Omit<JsonRpcSuccessfulResponseJson<any>, "jsonrpc">
    | Omit<JsonRpcErrorResponseJson<JsonRpcErrorJson<any>>, "jsonrpc">
;

export declare enum JsonRpcPeerState
{
    IDLE = 0,

    OPENING = 1,

    OPENED = 2,

    CORRUPTED = 3,

    CLOSING = 4,
}

export declare interface JsonRpcPeerEventMap
{
    "opened" : {
        source : JsonRpcPeer;
    };

    "closed" : {
        source : JsonRpcPeer;
    };

    "errorOccurred" : {
        source : JsonRpcPeer;
        error : Error;
    };

    "invocationFinished" : {
        source : JsonRpcPeer;
        results : ({
            request : JsonRpcRequestJson<any>;
            result? : any;
            error? : Error;
        })[];
    };
}

export declare interface JsonRpcRequestOption
{
    timeout? : number;
}

export declare type JsonRpcPeerEventListenerMap = {
    [ K in keyof JsonRpcPeerEventMap ] : (e : JsonRpcPeerEventMap[K]) => void
};
