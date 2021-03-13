var kapheinJsObjectUtils = require("kaphein-js-object-utils");
var extendClass = kapheinJsObjectUtils.extendClass;

module.exports = (function ()
{
    var WebSocketClosedError = extendClass(
        Error,
        /**
         *  @constructor
         *  @param {string} message
         *  @param {number} closeCode
         */
        function WebSocketClosedError()
        {
            this.closeCode = (Number.isInteger(arguments[1]) ? arguments[1] : 1006);
            this.message = (arguments[0] ? arguments[0] : "");
            this.name = "WebSocketClosedError";

            if(Error.captureStackTrace)
            {
                Error.captureStackTrace(this, WebSocketClosedError);
            }
        },
        {}
    );

    return {
        WebSocketClosedError : WebSocketClosedError
    };
})();
