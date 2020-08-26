var kapheinJs = require("kaphein-js");
var isString = kapheinJs.isString;
var extendClass = kapheinJs.extendClass;

module.exports = (function ()
{
    /**
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
         *  @param {number} [code]
         *  @param {string} [message]
         *  @param {any} [data]
         */
        function JsonRpcError()
        {
            this.code = (Number.isInteger(arguments[0]) ? arguments[0] : -32099);
            this.message = (
                isString(arguments[1])
                    ? arguments[1]
                    : (
                        this.code in _errorMessage
                            ? _errorMessage[this.code]
                            : "Server error"
                    )
            );
            this.data = arguments[2];
            this.name = "JsonRpcError";

            if(Error.captureStackTrace)
            {
                Error.captureStackTrace(this, JsonRpcError);
            }
        },
        {
            toJson : function toJson()
            {
                return (/** @type {JsonRpcErrorJson} */({
                    code : this.code,
                    message : this.message,
                    data : this.data
                }));
            }
        }
    );

    return {
        JsonRpcPredefinedErrorCode : JsonRpcPredefinedErrorCode,
        JsonRpcError : JsonRpcError
    };
})();
