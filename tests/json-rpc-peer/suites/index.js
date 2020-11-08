const open = require("./open.test");
const rpcCall = require("./rpc-call.test");
const multipleRpcCall = require("./multiple-rpc-call.test");
const notification = require("./notification.test");

module.exports = function ()
{
    open();
    rpcCall();
    multipleRpcCall();
    notification();
};
