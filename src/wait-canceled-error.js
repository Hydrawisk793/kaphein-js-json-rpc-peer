var kapheinJsTypeTrait = require("kaphein-js-type-trait");
var isString = kapheinJsTypeTrait.isString;
var kapheinJsObjectUtils = require("kaphein-js-object-utils");
var extendClass = kapheinJsObjectUtils.extendClass;

module.exports = (function ()
{
    var WaitCanceledError = extendClass(
        Error,
        /**
         *  @constructor
         *  @param {string} [message]
         *  @param {any} [data]
         */
        function WaitCanceledError()
        {
            this.name = "WaitCanceledError";
            this.message = (isString(arguments[0]) ? arguments[0] : "A waiting for a task has been cancelled.");
            this.data = arguments[1];

            if(Error.captureStackTrace)
            {
                Error.captureStackTrace(this, WaitCanceledError);
            }
        },
        function (arg0)
        {
            return [arg0];
        },
        {}
    );

    return {
        WaitCanceledError : WaitCanceledError
    };
})();
