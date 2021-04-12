const { expect } = require("chai");
const { ulid } = require("ulid");
const WebSocket = require("ws");

const {
    WaitCanceledError,
    JsonRpcPeer,
} = require("../../../src");

module.exports = function ()
{
    it("should wait for a method call or a notification from the other peer.", async function ()
    {
        this.timeout(10 * 1000);

        const url = `http://localhost:${ this.server.getCurrentPort() }`;
        const peer = new JsonRpcPeer();

        try
        {
            await peer.open(
                url,
                {
                    WebSocket,
                }
            );
            peer.setDefaultRpcHandler(() => null);

            peer.request({
                method : "notifyAfter",
                params : {
                    id : ulid(),
                    timeoutInMs : 2000,
                }
            });
            const handle = peer.waitFor("notifyAfter");
            const req = await handle;

            expect(req).is.a("object");
        }
        finally
        {
            await peer.close();
        }
    });

    it("should be able to cancel wating via a wait handle.", async function ()
    {
        this.timeout(10 * 1000);

        const url = `http://localhost:${ this.server.getCurrentPort() }`;
        const peer = new JsonRpcPeer();

        try
        {
            await peer.open(
                url,
                {
                    WebSocket,
                }
            );
            peer.setDefaultRpcHandler(() => null);

            peer.request({
                method : "notifyAfter",
                params : {
                    id : ulid(),
                    timeoutInMs : 5000,
                }
            });
            const handle = peer.waitFor("notifyAfter");
            setTimeout(function ()
            {
                handle.cancel("Canceled");
            }, 2000);
            await handle;
        }
        catch(error)
        {
            expect(error).is.instanceOf(WaitCanceledError);
            expect(error.message).to.have.string("Canceled");
        }
        finally
        {
            await peer.close();
        }
    });

    it("should be able to specify a timeout in milliseconds.", async function ()
    {
        this.timeout(10 * 1000);

        const url = `http://localhost:${ this.server.getCurrentPort() }`;
        const peer = new JsonRpcPeer();

        try
        {
            await peer.open(
                url,
                {
                    WebSocket,
                }
            );
            peer.setDefaultRpcHandler(() => null);

            peer.request({
                method : "notifyAfter",
                params : {
                    id : ulid(),
                    timeoutInMs : 5000,
                }
            });
            const handle = peer.waitFor("notifyAfter", 2000);
            await handle;

            throw new Error("Timeout does not work.");
        }
        catch(error)
        {
            expect(error).is.instanceOf(WaitCanceledError);
            expect(error.message.toLowerCase()).to.have.string("timeout");
        }
        finally
        {
            await peer.close();
        }
    });
};
