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
            `http://localhost:${ this.server.getCurrentPort() }`,
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
                `http://localhost:${ this.server.getCurrentPort() }`,
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
                `http://localhost:${ this.server.getCurrentPort() }`,
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

    it("should receive notifications", async function ()
    {
        this.timeout(0);

        try
        {
            await peer.open(
                `http://localhost:${ this.server.getCurrentPort() }`,
                {
                    WebSocket,
                }
            );

            const interval = 500;
            const repeatCount = 4;

            const values = [];
            peer.setRpcHandler("onTimer", function (peer, req)
            {
                const { value } = req.params;

                values.push(value);
            });

            const startTimerReturnValue = await peer.request({
                method : "startTimer",
                params : {
                    interval : interval,
                },
            });

            await wait((interval * repeatCount) + (interval / 4));

            const stopTimerReturnValue = await peer.request({
                method : "stopTimer"
            });

            assert.deepStrictEqual(values.length, repeatCount);
            assert.deepStrictEqual(startTimerReturnValue, true);
            assert.deepStrictEqual(stopTimerReturnValue, true);
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

    // eslint-disable-next-line no-unused-vars
    function wait(ms)
    {
        return new Promise(function (resolve)
        {
            setTimeout(resolve, ms);
        });
    }
};
