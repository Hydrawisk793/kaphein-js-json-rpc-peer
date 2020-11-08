const { assert } = require("chai");
const WebSocket = require("ws");
const { ulid } = require("ulid");

const {
    JsonRpcPeer,
} = require("../../../src");
const { wait } = require("../../utils");

module.exports = function ()
{
    it("should return immediately after a notification has been sent", async function ()
    {
        this.timeout(1500);

        const peer = new JsonRpcPeer();

        try
        {
            await peer.open(
                `http://localhost:${ this.server.getCurrentPort() }`,
                {
                    WebSocket,
                }
            );

            await peer.request({
                method : "add",
                params : [1, 2]
            });
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

        const peer = new JsonRpcPeer();

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

            const startTimerReturnValue = (await peer.request({
                id : ulid(),
                method : "startTimer",
                params : {
                    interval : interval,
                },
            })).result;

            await wait((interval * repeatCount) + (interval / 4));

            const stopTimerReturnValue = (await peer.request({
                id : ulid(),
                method : "stopTimer"
            })).result;

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
};
