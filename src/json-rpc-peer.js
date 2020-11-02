var kapheinJs = require("kaphein-js");
var isUndefined = kapheinJs.isUndefined;
var isUndefinedOrNull = kapheinJs.isUndefinedOrNull;
var isNonNullObject = kapheinJs.isNonNullObject;
var isString = kapheinJs.isString;
var isFunction = kapheinJs.isFunction;
var StringKeyMap = kapheinJs.StringKeyMap;
var EventEmitter = require("kaphein-js-event-emitter").EventEmitter;

var WebSocketClosedError = require("./web-socket-closed-error").WebSocketClosedError;
var JsonRpcError = require("./json-rpc-error").JsonRpcError;
var JsonRpcPredefinedErrorCode = require("./json-rpc-error").JsonRpcPredefinedErrorCode;

module.exports = (function ()
{
    // TODO
    // 1. Exception instance와 JSON을 명확히 구별

    /**
     *  @typedef {ReturnType<typeof setTimeout>} TimeoutHandle
     */
    /**
     *  @template Params
     *  @typedef {import("./json-rpc-request-json").JsonRpcRequestJson<Params>} JsonRpcRequestJson
     */
    /**
     *  @template Params
     *  @typedef {import("./json-rpc-notification-json").JsonRpcNotificationJson<Params>} JsonRpcNotificationJson
     */
    /**
     *  @template Result
     *  @typedef {import("./json-rpc-successful-response-json").JsonRpcSuccessfulResponseJson<Result>} JsonRpcSuccessfulResponseJson
     */
    /**
     *  @template Data
     *  @typedef {import("./json-rpc-error-json").JsonRpcErrorJson<Data>} JsonRpcErrorJson
     */
    /**
     *  @template {JsonRpcErrorJson<any>} ErrorJson
     *  @typedef {import("./json-rpc-error-response-json").JsonRpcErrorResponseJson<ErrorJson>} JsonRpcErrorResponseJson
     */
    /**
     *  @typedef {import("./json-rpc-peer").JsonRpcFunction} JsonRpcFunction
     *  @typedef {import("./json-rpc-peer").JsonRpcPeerEventListenerMap} JsonRpcPeerEventListenerMap
     *  @typedef {import("./json-rpc-peer").JsonRpcNonJsonRpcMessageHandler} JsonRpcNonJsonRpcMessageHandler
     *  @typedef {import("./json-rpc-peer").JsonRpcNonJsonMessageHandler} JsonRpcNonJsonMessageHandler
     */

    /**
     *  @template T
     *  @typedef {T | PromiseLike<T>} CanBePromiseLike
     */
    /**
     *  @typedef {
            JsonRpcRequestJson<any>
            | JsonRpcNotificationJson<any>
            | JsonRpcSuccessfulResponseJson<any>
            | JsonRpcErrorResponseJson<JsonRpcErrorJson<any>>
        } JsonRpcMessage
     */
    /**
     *  @typedef {{
            group : JsonRpcInvocationGroup;
            request : (JsonRpcRequestJson<any> | JsonRpcNotificationJson<any>);
            resolve : (response : CanBePromiseLike<any>) => void;
            reject : (response : Error) => void;
            promise : Promise<any>;
            timeout : TimeoutHandle;
        }} JsonRpcInvocation
     */
    /**
     *  @typedef {{
            isSingle : boolean;
            invocations : JsonRpcInvocation[];
            uncompleted : number;
            resolve : (response : CanBePromiseLike<any>) => void;
            reject : (response : Error) => void;
            promise : Promise<any>;
        }} JsonRpcInvocationGroup
     */
    /**
     *  @typedef {{
            request : JsonRpcRequestJson<any>;
            promise : Promise<any>;
        }} JsonRpcExecution
     */

    var evtEmtOption = {
        xBindThis : false,
        xEmitNewListenerEvent : false,
        xEmitRemoveListenerEvent : false,
        xPreventDuplicateListeners : true,
        xRemoveFirstFoundOne : true,
        xStrictMaxListenerCount : false,
        xWarnIfMaxListenerCountExceeds : false
    };

    /**
     *  @readonly
     *  @enum {number}
     */
    var State = {
        IDLE : 0,
        OPENING : 1,
        OPENED : 2,
        CORRUPTED : 3,
        CLOSING : 4
    };

    /**
     *  @constructor
     */
    function JsonRpcPeer()
    {
        if("undefined" === typeof Promise)
        {
            throw new Error("ECMAScript 6 Promise is not available in this environment.");
        }

        /** @type {State} */this._state = State.IDLE;
        /** @type {typeof WebSocket} */this._WebSocket = null;
        /** @type {WebSocket} */this._ws = null;
        this._wsClosedByError = false;
        /** @type {EventEmitter<JsonRpcPeerEventListenerMap>} */this._evtEmt = new EventEmitter(evtEmtOption);
        /** @type {any} */this._dfltCtx = this;
        this._nvocs = new StringKeyMap(/** @type {Iterable<[string, JsonRpcInvocation]>} */(null));
        this._xecs = new StringKeyMap(/** @type {Iterable<[string, JsonRpcExecution]>} */(null));
        this._rpcHandlers = new StringKeyMap(/** @type {Iterable<[string, JsonRpcFunction]>} */(null));
        /** @type {JsonRpcFunction} */this._dfltRpcHandler = null;
        /** @type {JsonRpcNonJsonRpcMessageHandler} */this._nonJsonRpcMsgHandler = null;
        /** @type {JsonRpcNonJsonMessageHandler} */this._nonJsonMsgHandler = null;

        this._wsOnMessage = _wsOnMessage.bind(this);
        this._wsOnClose = _wsOnClose.bind(this);
        this._wsOnError = _wsOnError.bind(this);
    }

    JsonRpcPeer.prototype = {
        constructor : JsonRpcPeer,

        addListener : function addListener(eventName, listener)
        {
            this._evtEmt.addListener(eventName, listener);

            return this;
        },

        removeListener : function removeListener(eventName, listener)
        {
            this._evtEmt.removeListener(eventName, listener);

            return this;
        },

        on : function on(eventName, listener)
        {
            this._evtEmt.on(eventName, listener);

            return this;
        },

        once : function once(eventName, listener)
        {
            this._evtEmt.once(eventName, listener);

            return this;
        },

        off : function off(eventName, listener)
        {
            this._evtEmt.off(eventName, listener);

            return this;
        },

        getState : function getState()
        {
            return this._state;
        },

        open : function open(arg)
        {
            var thisRef = this;
            var option = arguments[1];

            return new Promise(function (resolve)
            {
                var promise = null;
                if(isString(arg))
                {
                    promise = _openWithUrl(thisRef, arg, option);
                }
                else if(_isInstanceOfWebSocket(arg))
                {
                    promise = _openWithWebSocket(thisRef, arg);
                }
                else
                {
                    throw new TypeError("The first parameter must be either a string or an instance of 'WebSocket'.");
                }

                resolve(promise);
            })
                .then(function ()
                {
                    thisRef._state = State.OPENED;
                    thisRef._evtEmt.emit(
                        "opened",
                        {
                            source : thisRef
                        }
                    );
                })
                .catch(function (error)
                {
                    thisRef._state = State.CORRUPTED;
                    thisRef._evtEmt.emit(
                        "errorOccurred",
                        {
                            source : thisRef,
                            error : error
                        }
                    );

                    return thisRef
                        .close()
                        .catch(function ()
                        {
                            // Ignore errors.
                        })
                        .then(function ()
                        {
                            throw error;
                        })
                    ;
                })
            ;
        },

        close : function close()
        {
            var thisRef = this;

            return new Promise(function (resolve)
            {
                switch(thisRef._state)
                {
                case State.IDLE:
                    resolve();
                    break;
                case State.OPENING:
                    throw new Error("The client is being opened.");
                    // break;
                case State.CLOSING:
                    throw new Error("The client is already being closed.");
                    // break;
                default:
                    resolve(_close(thisRef));
                }
            });
        },

        getSocketClient : function getSocketClient()
        {
            return this._ws;
        },

        getHandlerDefaultContext : function getHandlerDefaultContext()
        {
            return this._dfltCtx;
        },

        setHandlerDefaultContext : function setHandlerDefaultContext()
        {
            var context = arguments[0];
            if(isUndefined(context))
            {
                context = this;
            }

            this._dfltCtx = context;
        },

        setDefaultRpcHandler : function setDefaultRpcHandler(handler)
        {
            this._dfltRpcHandler = (isFunction(handler) ? handler : null);
        },

        setRpcHandler : function setRpcHandler(method, handler)
        {
            this._rpcHandlers.set(method, handler);
        },

        setNonJsonRpcMessageHandler : function setNonJsonRpcMessageHandler(handler)
        {
            if(!isFunction(handler))
            {
                throw new TypeError("'handler' must be a function.");
            }

            this._nonJsonRpcMsgHandler = handler;
        },

        setNonJsonMessageHandler : function setNonJsonMessageHandler(handler)
        {
            if(!isFunction(handler))
            {
                throw new TypeError("'handler' must be a function.");
            }

            this._nonJsonMsgHandler = handler;
        },

        /**
         *  @param {
                Omit<JsonRpcRequestJson<any>, "jsonrpc">
                | Omit<JsonRpcRequestJson<any>, "jsonrpc">[]
            } req
            @param {Record<string, any>} [option]
         */
        request : function request(req)
        {
            return _invokeRemote(this, req, Object.assign({}, arguments[1]));
        }
    };

    /**
     *  @this {JsonRpcPeer}
     *  @param {WebSocketEventMap["message"]} e
     */
    function _wsOnMessage(e)
    {
        var isNonJsonRpcMessage = false;

        var data = e.data;
        if(isString(data))
        {
            var json = _tryParseJson(data);
            if(isNonNullObject(json))
            {
                _processJsonRpcMessage(this, json);
            }
            else
            {
                isNonJsonRpcMessage = true;
            }
        }
        else
        {
            isNonJsonRpcMessage = true;
        }

        var nonJsonMessageHandler = this._nonJsonMsgHandler;
        if(isNonJsonRpcMessage && isFunction(nonJsonMessageHandler))
        {
            nonJsonMessageHandler(this._dfltCtx, data)
        }
    }

    /**
     *  @this {JsonRpcPeer}
     */
    function _wsOnError()
    {
        this._state = State.CORRUPTED;
        this._wsClosedByError = true;
    }

    /**
     *  @this {JsonRpcPeer}
     *  @param {WebSocketEventMap["close"]} e
     */
    function _wsOnClose(e)
    {
        _handleWsOnClose(this, e);

        if(this._state < State.CLOSING)
        {
            _scheduleClose(this);
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {WebSocketEventMap["close"]} e
     */
    function _handleWsOnClose(thisRef, e)
    {
        var closeResult = _getCloseResult(thisRef, e);
        if(thisRef._wsClosedByError)
        {
            thisRef._evtEmt.emit(
                "errorOccurred",
                {
                    source : thisRef,
                    error : new WebSocketClosedError(closeResult.reason, closeResult.code)
                }
            );
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {WebSocketEventMap["close"]} e
     */
    function _getCloseResult(thisRef, e)
    {
        var result = {
            code : (
                e.code
                    ? e.code
                    : (
                        thisRef._wsClosedByError
                            ? 1006
                            : 1000
                    )
            ),
            reason : ""
        };
        result.reason = (
            e.reason
                ? e.reason
                : (
                    thisRef._wsClosedByError
                        ? "The web socket connection has been closed because of an internal web socket error."
                        : "An unknown internal web socket error has occurred."
                )
        );

        return result;
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {JsonRpcPredefinedErrorCode} code
     *  @param {number | string | null} [id]
     *  @param {string | null} [message]
     *  @param {any} [data]
     */
    function _trySendPredefinedError(thisRef, code)
    {
        _trySendJson(
            thisRef,
            _createErrorResponseJson(
                new JsonRpcError(code, arguments[3], arguments[4]),
                arguments[2]
            )
        );
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {any} json
     */
    function _trySendJson(thisRef, json)
    {
        /** @type {Error | null} */var finalError = null;

        try
        {
            _sendJsonText(thisRef, JSON.stringify(json));
        }
        catch(error)
        {
            finalError = error;
        }

        return finalError;
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {string} jsonText
     */
    function _sendJsonText(thisRef, jsonText)
    {
        var ws = thisRef._ws;
        if(ws)
        {
            ws.send(jsonText);
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {JsonRpcMessage | JsonRpcMessage[]} json
     */
    function _processJsonRpcMessage(thisRef, json)
    {
        var i;

        if(Array.isArray(json))
        {
            var methodMsgs = [];
            var resultMsgs = [];
            var otherMsgs = [];
            for(i = 0; i < json.length; ++i)
            {
                switch(_getMessageType(json[i]))
                {
                case "method":
                    methodMsgs.push(json);
                    break;
                case "result":
                case "error":
                    resultMsgs.push(json);
                    break;
                default:
                    otherMsgs.push(json);
                }
            }

            resultMsgs.forEach(function (msg)
            {
                switch(_getMessageType(msg))
                {
                case "result":
                    _resolveInvocation(thisRef, msg.id, msg.result);
                    break;
                case "error":
                    _rejectInvocation(thisRef, msg.id, msg.error);
                    break;
                default:
                    // Does nothing.
                }
            });

            _executeLocal(thisRef, methodMsgs);
        }
        else if(isNonNullObject(json))
        {
            var type = _getMessageType(json);
            switch(type)
            {
            case "method":
                _executeLocal(thisRef, json);
                break;
            case "result":
                _resolveInvocation(thisRef, json.id, json.result);
                break;
            case "error":
                _rejectInvocation(thisRef, json.id, json.error);
                break;
            default:
                if(isFunction(thisRef._nonJsonRpcMsgHandler))
                {
                    thisRef._nonJsonRpcMsgHandler(thisRef._dfltCtx, json);
                }
                else
                {
                    _trySendPredefinedError(thisRef, JsonRpcPredefinedErrorCode.INVALID_REQUEST, json.id);
                }
            }
        }
        else if(isFunction(thisRef._nonJsonMsgHandler))
        {
            thisRef._nonJsonMsgHandler(thisRef._dfltCtx, json);
        }
        else
        {
            _trySendPredefinedError(thisRef, JsonRpcPredefinedErrorCode.INVALID_REQUEST, json.id);
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {string} url
     *  @param {Record<string, any>} [option]
     */
    function _openWithUrl(thisRef, url)
    {
        var option = Object.assign(
            {
                WebSocket : ("undefined" === typeof WebSocket ? null : WebSocket)
            },
            arguments[2]
        );

        return new Promise(function (resolve, reject)
        {
            if(!isString(url))
            {
                throw new TypeError("'url' must be a string.");
            }

            _assertCanBeOpened(thisRef);
            thisRef._state = State.OPENING;

            thisRef._wsClosedByError = false;
            thisRef._option = option;

            /** @type {typeof WebSocket} */var _WebSocket = option.WebSocket;
            if(!_WebSocket)
            {
                throw new Error("A proper implementation of WebSocket must be provided.");
            }
            thisRef._WebSocket = _WebSocket;

            var ws = new _WebSocket(url);
            thisRef._ws = ws;

            function onOpened()
            {
                ws.removeEventListener("close", onOpenFailed);

                ws.addEventListener("message", thisRef._wsOnMessage);
                ws.addEventListener("close", thisRef._wsOnClose);

                resolve();
            }

            /**
             *  @param {WebSocketEventMap["close"]} e
             */
            function onOpenFailed(e)
            {
                ws.removeEventListener("open", onOpened);

                var closeResult = _getCloseResult(this, e);

                reject(new WebSocketClosedError(closeResult.reason, closeResult.code));
            }

            ws.addEventListener("error", thisRef._wsOnError);
            ws.addEventListener("open", onOpened, { once : true });
            ws.addEventListener("close", onOpenFailed, { once : true });
        });
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {WebSocket} ws
     */
    function _openWithWebSocket(thisRef, ws)
    {
        return new Promise(function (resolve)
        {
            if(!_isInstanceOfWebSocket(ws))
            {
                throw new TypeError("'ws' must be an instance of 'WebSocket'.");
            }

            /** @type {typeof WebSocket} */var _WebSocket = ws.constructor;
            if(_WebSocket.OPEN !== ws.readyState)
            {
                throw new Error("'ws' must be already in OPEN state.");
            }

            _assertCanBeOpened(thisRef);
            thisRef._state = State.OPENING;

            thisRef._wsClosedByError = false;
            thisRef._option = null;

            thisRef._WebSocket = _WebSocket;
            thisRef._ws = ws;

            ws.addEventListener("error", thisRef._wsOnError);
            ws.addEventListener("message", thisRef._wsOnMessage);
            ws.addEventListener("close", thisRef._wsOnClose);

            resolve();
        });
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     */
    function _assertCanBeOpened(thisRef)
    {
        switch(thisRef._state)
        {
        case State.IDLE:
            // Does nothing.
            break;
        case State.OPENING:
            throw new Error("The peer is already being opened.");
            // break;
        case State.OPENED:
            throw new Error("The peer is already opened.");
            // break;
        case State.CORRUPTED:
            throw new Error("The peer is in corrupted state.");
            // break;
        case State.CLOSING:
            throw new Error("The peer is being closed.");
            // break;
        default:
            throw new Error("The peer is being closed.");
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     */
    function _close(thisRef)
    {
        var WebSocket = thisRef._WebSocket;

        return new Promise(function (resolve)
        {
            thisRef._state = State.CLOSING;

            thisRef._nvocs.forEach(function (nvoc)
            {
                var id = nvoc.request.id;

                _rejectInvocation(
                    thisRef,
                    id,
                    new JsonRpcError(
                        -32003,
                        "RPC call " + id + " has been canceled because the JSON RPC peer is being closed."
                    )
                );
            });

            resolve(Promise.allSettled(thisRef._xecs.map(
                function (xec)
                {
                    return xec.promise;
                }
            )));
        })
            .then(function ()
            {
                return new Promise(function (resolve)
                {
                    var ws = thisRef._ws;
                    if(ws)
                    {
                        ws.removeEventListener("message", thisRef._wsOnMessage);
                        ws.removeEventListener("close", thisRef._wsOnClose);

                        if(WebSocket.CLOSED !== ws.readyState)
                        {
                            ws.addEventListener("close", function (e)
                            {
                                _handleWsOnClose(thisRef, e);

                                ws.removeEventListener("error", thisRef._wsOnError);

                                resolve();
                            }, { once : true });
                            ws.close(1000);
                        }
                        else
                        {
                            ws.removeEventListener("error", thisRef._wsOnError);
                            ws.close(1000);
                            resolve();
                        }
                    }
                });
            })
            .catch(function ()
            {
                // Ignore errors.
            })
            .then(function ()
            {
                thisRef._option = null;
                thisRef._WebSocket = null;
                thisRef._ws = null;

                thisRef._state = State.IDLE;
                thisRef._evtEmt.emit(
                    "closed",
                    {
                        source : thisRef
                    }
                );
            })
        ;
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     */
    function _scheduleClose(thisRef)
    {
        setTimeout(function ()
        {
            if(thisRef._state < State.CLOSING)
            {
                thisRef
                    .close()
                    .catch(function ()
                    {
                        // Ignore errors.
                    })
                ;
            }
        });
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {
            Omit<JsonRpcRequestJson<any>, "jsonrpc">
            | Omit<JsonRpcRequestJson<any>, "jsonrpc">[]
        } arg
        @param {Record<string, any>} option
     */
    function _invokeRemote(thisRef, arg, option)
    {
        var isSingle = false;
        var promise = new Promise(function (resolveNvoc, rejectNvoc)
        {
            var i;
            /** @type {Omit<JsonRpcRequestJson<any>, "jsonrpc">[]} */var reqs = arg;
            if(!Array.isArray(arg))
            {
                reqs = [arg];
                isSingle = true;
            }

            reqs = reqs.map(_filterRequest);

            /** @type {JsonRpcInvocationGroup} */var group = {
                isSingle : isSingle,
                invocations : [],
                uncompleted : 0,
                resolve : resolveNvoc,
                reject : rejectNvoc,
                promise : promise
            };
            for(i = 0; i < reqs.length; ++i)
            {
                _createInvocation(thisRef, reqs[i], group, option);
            }
        })
            .then(function (reses)
            {
                return (
                    isSingle
                        ? (Array.isArray(reses) && reses.length > 0 ? reses[0] : void 0)
                        : (Array.isArray(reses) ? reses : void 0)
                );
            })
        ;

        return promise;
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {JsonRpcRequestJson<any> | JsonRpcNotificationJson<any>} req
     *  @param {JsonRpcInvocationGroup} group
     *  @param {Record<string, any>} option
     */
    function _createInvocation(thisRef, req, group, option)
    {
        /** @type {JsonRpcInvocation} */var nvoc = {
            group : group,
            request : req,
            resolve : null,
            reject : null,
            promise : null,
            timeout : null
        };
        var nvocId = nvoc.request.id;
        if(!isUndefinedOrNull(nvocId))
        {
            group.invocations.push(nvoc);
            thisRef._nvocs.set(nvocId, nvoc);
        }
        ++group.uncompleted;
        nvoc.promise = new Promise(function (resolveTask, rejectTask)
        {
            nvoc.resolve = resolveTask;
            nvoc.reject = rejectTask;

            var req = nvoc.request;
            thisRef._ws.send(_tryStringifyJson(req));
            if(isUndefinedOrNull(req.id))
            {
                resolveTask();
            }
            else
            {
                setTimeout(
                    function ()
                    {
                        rejectTask(new Error("A RPC call timeout has been reached."));
                    },
                    (
                        (
                            Number.isSafeInteger(option.timeout)
                            && option.timeout >= 0
                        )
                            ? option.timeout
                            : 3000
                    )
                );
            }
        })
            .then(function (result)
            {
                if(!isUndefined(result))
                {
                    nvoc.result = result;
                }
                _finishInvocation(thisRef, nvoc);

                return result;
            })
            .catch(function (error)
            {
                nvoc.error = error;
                _finishInvocation(thisRef, nvoc);
            })
        ;

        return nvoc;
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {JsonRpcInvocation} nvoc
     */
    function _finishInvocation(thisRef, nvoc)
    {
        nvoc.timeout = null;

        var group = nvoc.group;
        var nvocId = nvoc.request.id;
        if(!isUndefinedOrNull(nvocId))
        {
            thisRef._nvocs["delete"](nvocId);
        }
        --group.uncompleted;

        if(group.uncompleted < 1)
        {
            var results = group.invocations.map(function (nvoc)
            {
                var resultDesc = {
                    request : nvoc.request,
                    result : nvoc.result,
                    error : nvoc.error
                };
                if("error" in nvoc)
                {
                    resultDesc.error = nvoc.error;
                }
                else if("result" in nvoc)
                {
                    resultDesc.result = nvoc.result;
                }

                return resultDesc;
            });

            setTimeout(function ()
            {
                if(State.OPENED === thisRef._state)
                {
                    thisRef._evtEmt.emit(
                        "invocationFinished",
                        {
                            source : thisRef,
                            results : results
                        }
                    );
                }
            });

            group.resolve(results);
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {string} id
     *  @param {any} result
     */
    function _resolveInvocation(thisRef, id, result)
    {
        if(!isUndefinedOrNull(id))
        {
            var nvoc = thisRef._nvocs.get(id);
            if(nvoc)
            {
                nvoc.resolve(result);
            }
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {string} id
     *  @param {JsonRpcError} error
     */
    function _rejectInvocation(thisRef, id, error)
    {
        if(!isUndefinedOrNull(id))
        {
            var nvoc = thisRef._nvocs.get(id);
            if(nvoc)
            {
                nvoc.reject(error);
            }
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {
            (JsonRpcRequestJson<any> | JsonRpcNotificationJson<any>)
            | (JsonRpcRequestJson<any> | JsonRpcNotificationJson<any>)[]
        } arg
     */
    function _executeLocal(thisRef, arg)
    {
        var isSingle = false;

        return new Promise(function (resolve)
        {
            /** @type {(JsonRpcRequestJson<any> | JsonRpcNotificationJson<any>)[]} */var reqs = arg;
            if(!Array.isArray(reqs))
            {
                reqs = [arg];
                isSingle = true;
            }

            var i;
            var tasks = [];
            for(i = 0; i < reqs.length; ++i)
            {
                var req = reqs[i];

                if("2.0" !== req.jsonrpc)
                {
                    throw new JsonRpcError(
                        JsonRpcPredefinedErrorCode.INVALID_REQUEST,
                        "Only JSON-RPC 2.0 RPC calls are supported."
                    );
                }

                var id = null;
                if("id" in req)
                {
                    id = req.id;

                    if(!isUndefinedOrNull(id) && !Number.isInteger(id) && !isString(id))
                    {
                        throw new JsonRpcError(JsonRpcPredefinedErrorCode.INVALID_REQUEST);
                    }
                }

                var method = req.method;
                if(!isString(method))
                {
                    throw new JsonRpcError(JsonRpcPredefinedErrorCode.INVALID_REQUEST);
                }

                var rpcFunc = thisRef._rpcHandlers.get(method) || thisRef._dfltRpcHandler;
                if(!rpcFunc)
                {
                    throw new JsonRpcError(JsonRpcPredefinedErrorCode.METHOD_NOT_FOUND);
                }

                tasks.push(_callRpcHandler(thisRef, req, rpcFunc));
            }

            resolve(Promise.all(tasks));
        })
            .then(function (responses)
            {
                _trySendJson(thisRef, (isSingle ? responses[0] : responses));
            })
            .catch(function (error)
            {
                thisRef._evtEmt.emit(
                    "errorOccurred",
                    {
                        source : thisRef,
                        error : error
                    }
                );
            })
        ;
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {JsonRpcRequestJson<any>} req
     *  @param {JsonRpcFunction} rpcHandler
     */
    function _callRpcHandler(thisRef, req, rpcHandler)
    {
        var id = req.id;

        return new Promise(function (resolve)
        {
            /** @type {JsonRpcExecution} */var xec = null;
            if(!isUndefinedOrNull(id))
            {
                if(thisRef._xecs.has(id))
                {
                    throw new JsonRpcError(JsonRpcPredefinedErrorCode.INVALID_REQUEST);
                }

                xec = {
                    request : req,
                    promise : null
                };
                thisRef._xecs.set(id, xec);
            }

            var promise = new Promise(function (resolve)
            {
                resolve((0, rpcHandler).call(void 0, thisRef._dfltCtx, req));
            });
            if(xec)
            {
                xec.promise = promise;
            }

            resolve(promise);
        })
            .then(function (result)
            {
                if(!isUndefinedOrNull(id))
                {
                    thisRef._xecs["delete"](id);
                }

                /** @type {JsonRpcSuccessfulResponseJson<any>} */var responseJson = {
                    jsonrpc : "2.0",
                    result : result
                };
                if(!isUndefinedOrNull(id))
                {
                    responseJson.id = id;
                }

                return responseJson;
            })
            .catch(function (error)
            {
                if(!isUndefinedOrNull(id))
                {
                    thisRef._xecs["delete"](id);
                }

                /** @type {JsonRpcErrorResponseJson<any>} */var responseJson = {
                    jsonrpc : "2.0",
                    error : (
                        error instanceof JsonRpcError
                            ? error.toJson()
                            : new JsonRpcError(-32002, error.message).toJson()
                    )
                };
                if(!isUndefinedOrNull(id))
                {
                    responseJson.id = id;
                }

                return responseJson;
            })
        ;
    }

    /**
     *  @param {JsonRpcMessage} json
     */
    function _getMessageType(json)
    {
        /** @type {null | "error" | "result" | "method"} */var type = null;

        if("error" in json)
        {
            type = "error";
        }
        else if("result" in json)
        {
            type = "result";
        }
        else if("method" in json)
        {
            type = "method";
        }

        return type;
    }

    /**
     *  @param {JsonRpcRequestJson<any> | JsonRpcNotificationJson<any>} req
     *  @returns {JsonRpcRequestJson<any> | JsonRpcNotificationJson<any>}
     */
    function _filterRequest(req)
    {
        var method = req.method;
        if(!isString(method))
        {
            throw new TypeError("'method' must be a string.");
        }

        /** @type {typeof req} */var finalReq = {
            jsonrpc : "2.0",
            method : method
        };

        var id = req.id;
        if(!isUndefinedOrNull(id))
        {
            finalReq.id = id;
        }

        var params = req.params;
        if(!isUndefined(params))
        {
            finalReq.params = params;
        }

        var reqText = _tryStringifyJson(finalReq);
        if(isUndefined(reqText))
        {
            throw new Error("'params' must be serializable as JSON.");
        }

        return finalReq;
    }

    /**
     *  @template {JsonRpcError<any>} E
     *  @param {E} jsonRpcError
     *  @param {number | string | null} [id]
     */
    function _createErrorResponseJson(jsonRpcError)
    {
        /** @type {JsonRpcErrorResponseJson<ReturnType<E["toJson"]>>} */var errorResJson = {
            jsonrpc : "2.0",
            error : jsonRpcError.toJson()
        };

        var id = arguments[1];
        if(!isUndefined(id))
        {
            errorResJson.id = id;
        }

        return errorResJson;
    }

    /**
     *  @param {string} text
     */
    function _tryParseJson(text)
    {
        var json = void 0;

        try
        {
            json = JSON.parse(text);
        }
        catch(error)
        {
            // Ignore errors.
        }

        return json;
    }

    /**
     *  @returns {string | void}
     */
    function _tryStringifyJson(json)
    {
        var text = void 0;

        try
        {
            text = _stringifyJson(json);
        }
        catch(error)
        {
            // Ignore errors.
        }

        return text;
    }

    function _stringifyJson(json)
    {
        return JSON.stringify(json);
    }

    /**
     *  @param {any} v
     *  @returns {v is WebSocket}
     */
    function _isInstanceOfWebSocket(v)
    {
        return isNonNullObject(v)
            && _isWebSocketConstructor(v.constructor)
            && isFunction(v.send)
        ;
    }

    /**
     *  @param {any} v
     *  @returns {v is typeof WebSocket}
     */
    function _isWebSocketConstructor(v)
    {
        return isFunction(v);
    }

    return {
        JsonRpcPeerState : State,
        JsonRpcPeer : JsonRpcPeer
    };
})();
