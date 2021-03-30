const { expect } = require("chai");
const WebSocket = require("ws");

const {
    JsonRpcPeer,
} = require("../../../src");

module.exports = function ()
{
    it("should open a peer.", async function ()
    {
        this.timeout(5000);

        const url = `http://localhost:${ this.server.getCurrentPort() }`;
        const peer = new JsonRpcPeer();
        await peer.open(
            url,
            {
                WebSocket,
            }
        );
        await peer.close();
    });

    it("should deal with repeated open and close calls.", async function ()
    {
        this.timeout(5000);

        const url = `http://localhost:${ this.server.getCurrentPort() }`;
        const peer = new JsonRpcPeer();
        for(let i = 0; i < 16; ++i)
        {
            try
            {
                await peer.open(
                    url,
                    {
                        WebSocket,
                    }
                );
            }
            finally
            {
                await peer.close();
            }
        }
    });

    it("should deal with open failures.", async function ()
    {
        this.timeout(5000);

        const errors = [];
        const peer = new JsonRpcPeer();
        peer.on("errorOccurred", function (e)
        {
            errors.push(e.error);
        });
        for(let i = 0; i < 16; ++i)
        {
            try
            {
                await peer.open(
                    "a-wrong-url",
                    {
                        WebSocket,
                    }
                );
            }
            catch(error)
            {
                expect(error).to.equal(errors[i]);
            }
            finally
            {
                await peer.close();
            }
        }
    });

    it("should use an external socket.", async function ()
    {
        this.timeout(5000);

        const url = `http://localhost:${ this.server.getCurrentPort() }`;
        const peer = new JsonRpcPeer();
        let ws = null;
        try
        {
            ws = await new Promise(function (resolve, reject)
            {
                const ws = new WebSocket(url);
                ws.addEventListener("open", function (e)
                {
                    resolve(e.target);
                }, { once : true });
                ws.addEventListener("error", function (e)
                {
                    reject(e.error);
                }, { once : true });
            });

            await peer.open(ws);
        }
        finally
        {
            await peer.close();

            expect(ws.readyState).to.not.equal(ws.CLOSED);

            if(ws)
            {
                ws.close(1000);
            }
        }
    });

    it("should close the external socket if the peer owned the socket.", async function ()
    {
        this.timeout(5000);

        const url = `http://localhost:${ this.server.getCurrentPort() }`;
        const peer = new JsonRpcPeer();
        let ws = null;
        try
        {
            ws = await new Promise(function (resolve, reject)
            {
                const ws = new WebSocket(url);
                ws.addEventListener("open", function (e)
                {
                    resolve(e.target);
                }, { once : true });
                ws.addEventListener("error", function (e)
                {
                    reject(e.error);
                }, { once : true });
            });

            await peer.open(ws, true);
        }
        finally
        {
            await peer.close();

            expect(ws.readyState).to.equal(ws.CLOSED);
        }
    });

    it("should keep the reference of the instance of WebSocket class after closed.", async function ()
    {
        this.timeout(5000);

        const url = `http://localhost:${ this.server.getCurrentPort() }`;
        const peer = new JsonRpcPeer();
        await peer.open(
            url,
            {
                WebSocket,
            }
        );
        const ws = peer.getSocketClient();
        await peer.close();

        expect(ws).to.equal(peer.getSocketClient());
    });
};
