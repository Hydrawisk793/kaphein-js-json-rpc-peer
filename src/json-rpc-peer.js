var kapheinJs = require("kaphein-js");
var isUndefined = kapheinJs.isUndefined;
var isUndefinedOrNull = kapheinJs.isUndefinedOrNull;
var isNonNullObject = kapheinJs.isNonNullObject;
var isString = kapheinJs.isString;
var isFunction = kapheinJs.isFunction;
var StringKeyMap = kapheinJs.StringKeyMap;
var EventEmitter = require("kaphein-js-event-emitter").EventEmitter;
var ulid = require("ulid").ulid;

var WebSocketClosedError = require("./web-socket-closed-error").WebSocketClosedError;
var JsonRpcError = require("./json-rpc-error").JsonRpcError;
var JsonRpcPredefinedErrorCode = require("./json-rpc-error").JsonRpcPredefinedErrorCode;

module.exports = (function ()
{
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
     *  @template Params, Result
     *  @typedef {{
            request : JsonRpcRequestJson<Params>;
            promise : Promise<Result>;
        }} JsonRpcExecution
     */
    /**
     *  @template Params, Result
     *  @typedef {{
            request : JsonRpcRequestJson<Params>;
            resolve : (response : CanBePromiseLike<Result>) => void;
            reject : (response : Error) => void;
            timeout : TimeoutHandle;
        }} JsonRpcInvocation
     */

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

        /** @type {Record<string, any>} */this._option = null;
        /** @type {typeof WebSocket} */this._WebSocket = null;
        /** @type {State} */this._state = State.IDLE;
        /** @type {WebSocket} */this._ws = null;
        this._closedByError = false;
        this._evtEmt = new EventEmitter();
        this._executions = new StringKeyMap(/** @type {Iterable<[JsonRpcRequestJson<any>["id"], JsonRpcExecution<any, any>]>} */(null));
        this._invocations = new StringKeyMap(/** @type {Iterable<[JsonRpcRequestJson<any>["id"], JsonRpcInvocation<any, any>]>} */(null));
        this._rpcFunctions = new StringKeyMap(/** @type {Iterable<[string, Function]>} */(null));

        this._wsOnMessage = _wsOnMessage.bind(this);
        this._wsOnError = _wsOnError.bind(this);
        this._wsOnClose = _wsOnClose.bind(this);
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
            var WebSocket = this._WebSocket;
            var thisRef = this;

            return new Promise(function (resolve)
            {
                switch(thisRef._state)
                {
                case State.OPENING:
                    throw new Error("The client is being opened.");
                    // break;
                case State.CLOSING:
                    throw new Error("The client is already being closed.");
                    // break;
                default:
                    // Does nothing.
                }
                thisRef._state = State.CLOSING;

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
                    }
                    else
                    {
                        ws.removeEventListener("error", thisRef._wsOnError);
                    }

                    ws.close(1000);
                }

                resolve();
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
        },

        setRpcFunction : function setRpcFunction(method, func)
        {
            this._rpcFunctions.set(method, func);
        },

        /**
         *  @param {
                Omit<JsonRpcRequestJson<any>, "jsonrpc" | "id">
                | Omit<JsonRpcRequestJson<any>, "jsonrpc" | "id">[]
            } req
            @param {Record<string, any>} [option]
         */
        request : function request(req)
        {
            var thisRef = this;
            var option = arguments[1];

            return new Promise(function (resolve)
            {
                if(Array.isArray(req))
                {
                    throw new Error("Not implemented yet.");
                }

                resolve(_invokeRemote(thisRef, ulid(), req.method, req.params, option));
            });
        },

        /**
         *  @param {
                Omit<JsonRpcNotificationJson<any>, "jsonrpc" | "id">
                | Omit<JsonRpcNotificationJson<any>, "jsonrpc" | "id">[]
            } req
         */
        notify : function notify(req)
        {
            var thisRef = this;
            var option = arguments[1];

            return new Promise(function (resolve)
            {
                if(Array.isArray(req))
                {
                    throw new Error("Not implemented yet.");
                }

                resolve(_invokeRemote(thisRef, null, req.method, req.params, option));
            });
        }
    };

    /**
     *  @this {JsonRpcPeer}
     *  @param {WebSocketEventMap["message"]} e
     */
    function _wsOnMessage(e)
    {
        var data = e.data;
        if(isString(data))
        {
            var json = _tryParseJson(data);
            if(!isUndefined(json))
            {
                _processJsonRpcMessage(this, json);
            }
            else
            {
                this.$processNonJsonMessage(json);
            }
        }
        else
        {
            this.$processNonStringMessage(json);
        }
    }

    /**
     *  @this {JsonRpcPeer}
     */
    function _wsOnError()
    {
        this._state = State.CORRUPTED;
        this._closedByError = true;
    }

    /**
     *  @this {JsonRpcPeer}
     *  @param {WebSocketEventMap["close"]} e
     */
    function _wsOnClose(e)
    {
        _handleWsOnClose(this, e);

        if(State.CLOSING !== this._state)
        {
            _scheduleClose(this);
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     */
    function _scheduleClose(thisRef)
    {
        setTimeout(function ()
        {
            thisRef
                .close()
                .catch(function ()
                {
                    // Ignore errors.
                })
            ;
        });
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

            thisRef._closedByError = false;
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

            thisRef._closedByError = false;
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
     *  @param {JsonRpcMessage | JsonRpcMessage[]} json
     */
    function _processJsonRpcMessage(thisRef, json)
    {
        var i;

        if(Array.isArray(json))
        {
            if(json.length < 1)
            {
                _trySendPredefinedError(thisRef, JsonRpcPredefinedErrorCode.INVALID_REQUEST);
            }
            else
            {
                var firstMsg = json[0];
                var firstMsgType = _getMessageType(firstMsg);
                var isValid = !!firstMsgType;
                var ids = [];
                for(i = 1; isValid && i < json.length; ++i)
                {
                    var msg = json[i];
                    var msgType = _getMessageType(msg);
                    isValid = !!msgType && _argMessageTypesHomogeneous(firstMsgType, msgType);
                    if(isValid)
                    {
                        ids.push(msg.id);
                    }
                }
                if(!isValid)
                {
                    _trySendJson(new Array(json.length).fill(_createErrorResponseJson(new JsonRpcError(JsonRpcPredefinedErrorCode.INVALID_REQUEST))));
                }
                else
                {
                    switch(type)
                    {
                    case "method":
                        json.forEach(function (msg)
                        {
                            _executeLocal(thisRef, msg);
                        });
                        break;
                    case "result":
                        json.forEach(function (msg)
                        {
                            _resolveInvocation(thisRef, msg.id, msg.result);
                        });
                        break;
                    case "error":
                        json.forEach(function (msg)
                        {
                            _rejectInvocation(thisRef, msg.id, msg.error);
                        });
                        break;
                    default:
                        // Must not happen.
                        throw new Error("The peer failed to handle exceptional situations.");
                    }
                }
            }
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
                _trySendPredefinedError(thisRef, JsonRpcPredefinedErrorCode.INVALID_REQUEST);
            }
        }
        else
        {
            _trySendPredefinedError(thisRef, JsonRpcPredefinedErrorCode.INVALID_REQUEST);
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {WebSocketEventMap["close"]} e
     */
    function _handleWsOnClose(thisRef, e)
    {
        var closeResult = _getCloseResult(thisRef, e);
        if(thisRef._closedByError)
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
                        thisRef._closedByError
                            ? 1006
                            : 1000
                    )
            ),
            reason : ""
        };
        result.result = (
            e.reason
                ? e.reason
                : (
                    thisRef._closedByError
                        ? "Failed to open because of an internal web socket error."
                        : ""
                )
        );

        return result;
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {JsonRpcRequestJson<any>} req
     */
    function _executeLocal(thisRef, req)
    {
        var id = req.id;
        var method = req.method;

        return new Promise(function (resolve)
        {
            if("2.0" !== req.jsonrpc)
            {
                throw new JsonRpcError(
                    JsonRpcPredefinedErrorCode.INVALID_REQUEST,
                    "Only JSON RPC 2.0 invocations are supported."
                );
            }

            if("id" in req)
            {
                if(null !== id && !Number.isInteger(id) && !isString(id))
                {
                    throw new JsonRpcError(JsonRpcPredefinedErrorCode.INVALID_REQUEST);
                }
            }
            else
            {
                id = null;
            }

            if(!isString(req.method))
            {
                throw new JsonRpcError(JsonRpcPredefinedErrorCode.INVALID_REQUEST);
            }

            var rpcFunc = thisRef._rpcFunctions.get(method);
            if(!rpcFunc)
            {
                throw new JsonRpcError(JsonRpcPredefinedErrorCode.METHOD_NOT_FOUND);
            }

            resolve(_callRpc(thisRef, req, rpcFunc));
        })
            .catch(function (error)
            {
                var errorResponseJson = {
                    jsonrpc : "2.0",
                    error : null,
                    id : id
                };
                if(error instanceof JsonRpcError)
                {
                    errorResponseJson.error = error.toJson();
                }
                else
                {
                    errorResponseJson.error = new JsonRpcError(-32001, error.message).toJson();
                }

                _trySendJson(thisRef, errorResponseJson);
            })
        ;
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {JsonRpcRequestJson<any>} req
     *  @param {*} rpc
     */
    function _callRpc(thisRef, req, rpc)
    {
        var id = req.id;
        var lastError = null;

        return new Promise(function (resolve)
        {
            /** @type {JsonRpcExecution} */var execution = null;
            if(null !== id)
            {
                if(thisRef._executions.has(id))
                {
                    throw new JsonRpcError(JsonRpcPredefinedErrorCode.INVALID_REQUEST);
                }

                execution = {
                    request : req,
                    promise : null
                };
                thisRef._executions.set(id, execution);
            }

            var promise = ((0, rpc).call(void 0, thisRef, req));
            if(execution)
            {
                execution.promise = promise;
            }

            resolve(promise);
        })
            .then(function (result)
            {
                _trySendJson(
                    thisRef,
                    {
                        jsonrpc : "2.0",
                        result : result,
                        id : id
                    }
                );
            })
            .catch(function (error)
            {
                lastError = error;
            })
            .then(function ()
            {
                if(null !== id)
                {
                    thisRef._executions["delete"](id);
                }

                if(lastError)
                {
                    throw lastError;
                }
            })
        ;
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {number | string | null} id
     *  @param {string} method
     *  @param {any} [params]
     *  @param {Record<string, any>} [option]
     */
    function _invokeRemote(thisRef, id, method)
    {
        var params = arguments[3];
        var option = Object.assign(
            {
                timeout : 3000
            },
            arguments[4]
        );

        return new Promise(function (resolve, reject)
        {
            var ws = thisRef._ws;
            if(!ws || State.OPENED !== thisRef._state)
            {
                throw new Error("The client is not opened.");
            }

            /** @type {JsonRpcRequestJson<any> | JsonRpcNotificationJson<any>} */var req = {
                jsonrpc : "2.0",
                method : method
            };
            if(!isUndefinedOrNull(id))
            {
                req.id = id;
            }
            if(!isUndefined(params))
            {
                req.params = params;
            }

            var reqText = _tryStringifyJson(req);
            if(isUndefined(reqText))
            {
                throw new TypeError("'params' must be serializable to JSON.");
            }

            if(!isUndefinedOrNull(id))
            {
                thisRef._invocations.set(
                    id,
                    {
                        request : req,
                        resolve : resolve,
                        reject : reject,
                        timeout : setTimeout(function ()
                        {
                            _rejectInvocation(
                                thisRef,
                                id,
                                new JsonRpcError(-32000, "RPC call timeout.")
                            );
                        }, option.timeout)
                    }
                );
                ws.send(reqText);
            }
            else
            {
                ws.send(reqText);
                resolve();
            }
        });
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {string} id
     *  @param {any} result
     */
    function _resolveInvocation(thisRef, id, result)
    {
        var invocations = thisRef._invocations;
        var invocation = thisRef._invocations.get(id);
        if(invocation)
        {
            invocations["delete"](id);
            invocation.resolve(result);
        }
    }

    /**
     *  @param {JsonRpcPeer} thisRef
     *  @param {string} id
     *  @param {JsonRpcError} error
     */
    function _rejectInvocation(thisRef, id, error)
    {
        var invocations = thisRef._invocations;
        var invocation = thisRef._invocations.get(id);
        if(invocation)
        {
            invocations["delete"](id);
            invocation.reject(error);
        }
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

    // /**
    //  *  @param {JsonRpcPeer} thisRef
    //  *  @param {string} jsonText
    //  */
    // function _trySendJsonText(thisRef, jsonText)
    // {
    //     /** @type {Error | null} */var finalError = null;

    //     try
    //     {
    //         _sendJsonText(thisRef, jsonText);
    //     }
    //     catch(error)
    //     {
    //         finalError = error;
    //     }

    //     return finalError;
    // }

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
     *  @param {string} lhs
     *  @param {string} rhs
     */
    function _argMessageTypesHomogeneous(lhs, rhs)
    {
        var _lhs = (("result" === lhs || "error" === rhs) ? "resultOrError" : lhs);
        var _rhs = (("result" === rhs || "error" === rhs) ? "resultOrError" : rhs);

        return _lhs === _rhs;
    }

    /**
     *  @param {string} text
     */
    function _tryParseJson(text)
    {
        var json = null;

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
            text = JSON.stringify(json);
        }
        catch(error)
        {
            // Ignore errors.
        }

        return text;
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

        if(!isUndefined(arguments[1]))
        {
            errorResJson.id = arguments[1];
        }

        return errorResJson;
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
