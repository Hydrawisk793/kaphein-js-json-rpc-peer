import { EventListenable } from "kaphein-js-event-emitter";

import { JsonRpcRequestJson } from "./json-rpc-request-json";

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
        ws : WebSocket
    ) : Promise<void>;

    public close() : Promise<void>;

    public setRpcFunction(
        method : string,
        func : JsonRpcFunction
    ) : void;

    public request(
        request : Omit<JsonRpcRequestJson, "jsonrpc" | "id">,
        option? : Record<string, any>
    ) : Promise<any>;

    public notify(
        request : Omit<JsonRpcRequestJson, "jsonrpc" | "id">,
        option? : Record<string, any>
    ) : Promise<any>;
}

export declare type JsonRpcFunction = (
    peer : JsonRpcPeer,
    req : JsonRpcRequestJson<any>
) => Promise<any>;

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
}

export declare type JsonRpcPeerEventListenerMap = {
    [ K in keyof JsonRpcPeerEventMap ] : (e : JsonRpcPeerEventMap[K]) => void
};
