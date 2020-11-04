const WebSocket = require("ws");
const { assert } = require("chai");
const { ulid } = require("ulid");

const {
    JsonRpcPeer,
} = require("../../../src");

module.exports = function ()
{
    const peer = new JsonRpcPeer();

    it("should open a peer", async function ()
    {
        this.timeout(0);

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
        this.timeout(0);

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

    it("should call multiple RPCs in a batch", async function ()
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

    it("should return immediately after a notification has been sent", async function ()
    {
        this.timeout(1500);

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

    it("should fail to call non existing method", async function ()
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

    // eslint-disable-next-line no-unused-vars
    function wait(ms)
    {
        return new Promise(function (resolve)
        {
            setTimeout(resolve, ms);
        });
    }
};
