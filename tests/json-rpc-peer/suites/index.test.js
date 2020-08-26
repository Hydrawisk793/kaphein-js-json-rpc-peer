const WebSocket = require("ws");
const { assert } = require("chai");

const {
    JsonRpcPeer,
} = require("../../../src");

module.exports = function ()
{
    const peer = new JsonRpcPeer();

    it("should open a peer", async function ()
    {
        await peer.open(
            "http://localhost:3000",
            {
                WebSocket,
            }
        );
        await peer.close();
    });

    it("should call a RPC", async function ()
    {
        try
        {
            await peer.open(
                "http://localhost:3000",
                {
                    WebSocket,
                }
            );

            const result = await peer.request({
                method : "add",
                params : [1, 2]
            });
            assert.deepStrictEqual(result, 3);
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

    it("should call RPCs", async function ()
    {
        try
        {
            await peer.open(
                "http://localhost:3000",
                {
                    WebSocket,
                }
            );

            const count = 10;
            const promises = [];
            for(let i = 0; i < count; ++i)
            {
                promises.push(peer.request({
                    method : "add",
                    params : [1, 2]
                }));
            }
            const results = await Promise.all(promises);
            assert.deepStrictEqual(results, new Array(count).fill(3));
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
