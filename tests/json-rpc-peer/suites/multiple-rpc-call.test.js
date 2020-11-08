const { assert } = require("chai");
const WebSocket = require("ws");
const { ulid } = require("ulid");

const {
    JsonRpcPeer,
} = require("../../../src");

module.exports = function ()
{
    it("should call multiple RPCs in a batch", async function ()
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

            const paramsArr = [
                [1, 1],
                [2, 1],
                [1, 3],
                [4, 1],
                [1, 5],
                [6, 1],
                [1, 7],
                [8, 1],
                [1, 9],
                [10, 1],
            ];
            const results = paramsArr.map((params) => params[0] + params[1]);
            const reses = await peer.request(paramsArr.map((params) => ({
                id : ulid(),
                method : "add",
                params,
            })));
            assert.deepStrictEqual(reses.map((res) => res.result), results);
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
