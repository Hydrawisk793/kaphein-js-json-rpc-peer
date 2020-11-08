const { assert } = require("chai");
const WebSocket = require("ws");
const { ulid } = require("ulid");

const {
    JsonRpcPeer,
} = require("../../../src");

module.exports = function ()
{
    it("should call a RPC", async function ()
    {
        this.timeout(0);

        const peer = new JsonRpcPeer();

        try
        {
            await peer.open(
                `http://localhost:${ this.server.getCurrentPort() }`,
                {
                    WebSocket,
                }
            );

            const res = await peer.request({
                id : ulid(),
                method : "add",
                params : [1, 2]
            });
            assert.deepStrictEqual(res.result, 3);
        }
        finally
        {
            try
            {
                await peer.close();
            }
            catch(error)
            {
                // Does nothing.
            }
        }
    });

    it("should fail to call non existing method", async function ()
    {
        this.timeout(0);

        const peer = new JsonRpcPeer();

        try
        {
            await peer.open(
                `http://localhost:${ this.server.getCurrentPort() }`,
                {
                    WebSocket,
                }
            );

            const res = (await peer.request({
                id : ulid(),
                method : "methodThatDoesNotExist",
            }));
            assert.isObject(res.error);
        }
        finally
        {
            try
            {
                await peer.close();
            }
            catch(error)
            {
                // Does nothing.
            }
        }
    });
};
