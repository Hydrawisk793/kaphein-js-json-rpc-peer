const JsonRpcError = require("./json-rpc-error");
const JsonRpcPeer = require("./json-rpc-peer");

describe("JsonRpcPeer", function ()
{
    describe("JsonRpcError", JsonRpcError.bind(this));
    describe("JsonRpcPeer", JsonRpcPeer.bind(this));
});
