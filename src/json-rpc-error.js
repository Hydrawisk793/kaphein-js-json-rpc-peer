var kapheinJsTypeTrait = require("kaphein-js-type-trait");
var isUndefined = kapheinJsTypeTrait.isUndefined;
var isDefinedAndNotNull = kapheinJsTypeTrait.isDefinedAndNotNull;
var isString = kapheinJsTypeTrait.isString;
var kapheinJsObjectUtils = require("kaphein-js-object-utils");
var extendClass = kapheinJsObjectUtils.extendClass;

module.exports = (function ()
{
    /**
     *  @typedef {import("./json-rpc-error").JsonRpcError} JsonRpcError
     *  @typedef {import("./json-rpc-error-json").JsonRpcErrorJson} JsonRpcErrorJson
     */

    /**
     *  @readonly
     *  @enum {number}
     */
    var JsonRpcPredefinedErrorCode = {
        PARSE_ERROR : -32700,
        INVALID_REQUEST : -32600,
        METHOD_NOT_FOUND : -32601,
        INVALID_PARAMS : -32602,
        INTERNAL_ERROR : -32603
    };

    var _errorMessage = {};
    _errorMessage[JsonRpcPredefinedErrorCode.PARSE_ERROR] = "Parse error";
    _errorMessage[JsonRpcPredefinedErrorCode.INVALID_REQUEST] = "Invalid Request";
    _errorMessage[JsonRpcPredefinedErrorCode.METHOD_NOT_FOUND] = "Method not found";
    _errorMessage[JsonRpcPredefinedErrorCode.INVALID_PARAMS] = "Invalid params";
    _errorMessage[JsonRpcPredefinedErrorCode.INTERNAL_ERROR] = "Internal error";

    var JsonRpcError = extendClass(
        Error,
        /**
         *  @constructor
         */
        function JsonRpcError()
        {
            this.code = -32000;
            this.message = "";
            this._hasData = false;
            this.data = null;
            this.name = "JsonRpcError";

            if(Error.captureStackTrace)
            {
                Error.captureStackTrace(this, JsonRpcError);
            }

            var arg0 = arguments[0];
            if(arg0 instanceof Error)
            {
                if(_isInstanceOfJsonRpcError(arg0))
                {
                    _constructWithCodeMessageData.call(this, arg0.code, arg0.message, arg0.data);
                }
                else
                {
                    this.message = arg0.message;
                }
            }
            else
            {
                switch(typeof arg0)
                {
                case "string":
                    this.message = arg0;
                    break;
                default:
                    _constructWithCodeMessageData.call(this, arg0, arguments[1], arguments[2]);
                }
            }
        },
        {
            hasData : function hasData()
            {
                return this._hasData;
            },

            /**
             *  @param {JsonRpcError | null} other
             */
            assign : function assign(other)
            {
                if(null === other)
                {
                    _setCode(this, 32000);
                    _setMessage(this, null);
                    _setData(this);
                }
                else if(_isInstanceOfJsonRpcError(other))
                {
                    _setCode(this, other.code);
                    _setMessage(this, other.message);
                    _setData(this, other.data);
                }
                else
                {
                    throw new TypeError("'other' must be null or an instance of 'JsonRpcError'.");
                }

                return this;
            },

            /**
             *  @param {JsonRpcErrorJson | null} json
             */
            assignJson : function assignJson(json)
            {
                if(isDefinedAndNotNull(json))
                {
                    _setCode(this, json.code);
                    _setMessage(this, json.message);
                    _setData(this, json.data);
                }
                else
                {
                    _setCode(this, 32000);
                    _setMessage(this, "Server error");
                    _setData(this);
                }

                return this;
            },

            toJson : function toJson()
            {
                /** @type {JsonRpcErrorJson} */var json = {
                    code : this.code,
                    message : this.message
                };

                if(this._hasData)
                {
                    json.data = this.data;
                }

                return json;
            }
        }
    );

    /**
     *  @param {JsonRpcError} thisRef
     *  @returns {other is JsonRpcError}
     */
    function _isInstanceOfJsonRpcError(other)
    {
        return other instanceof Error
            && ("code" in other && Number.isSafeInteger(other.code))
        ;
    }

    /**
     *  @param {JsonRpcError} thisRef
     *  @param {number} code
     */
    function _setCode(thisRef, code)
    {
        if(!Number.isSafeInteger(code))
        {
            throw new TypeError("'code' must be a safe integer.");
        }

        thisRef.code = code;
    }

    /**
     *  @param {JsonRpcError} thisRef
     *  @param {string | null} message
     */
    function _setMessage(thisRef, message)
    {
        if(isDefinedAndNotNull(message))
        {
            if(!isString(message))
            {
                throw new TypeError("'message' must be a string.");
            }

            thisRef.message = message;
        }
        else
        {
            if(thisRef.code >= -32099 && thisRef.code <= -32000)
            {
                thisRef.message = "Server error";
            }
            else if(thisRef.code in _errorMessage)
            {
                thisRef.message = _errorMessage[thisRef.code];
            }
            else
            {
                thisRef.message = "Unknown error";
            }
        }
    }

    /**
     *  @param {JsonRpcError} thisRef
     *  @param {any} [data]
     */
    function _setData(thisRef)
    {
        var data = arguments[1];

        if(isUndefined(data))
        {
            thisRef._hasData = false;
        }
        else
        {
            thisRef._hasData = true;
            thisRef.data = JSON.parse(JSON.stringify(data));
        }
    }

    /**
     *  @this {JsonRpcError}
     *  @param {number} [code]
     *  @param {string} [message]
     *  @param {any} [data]
     */
    function _constructWithCodeMessageData()
    {
        var code = arguments[0];

        _setCode(this, (Number.isSafeInteger(code) ? code : -32000));
        _setMessage(this, arguments[1]);
        _setData(this, arguments[2]);
    }

    return {
        JsonRpcPredefinedErrorCode : JsonRpcPredefinedErrorCode,
        JsonRpcError : JsonRpcError
    };
})();
