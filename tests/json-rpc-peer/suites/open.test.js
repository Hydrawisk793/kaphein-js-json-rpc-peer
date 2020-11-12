const WebSocket = require("ws");

const {
    JsonRpcPeer,
} = require("../../../src");

module.exports = function ()
{
    it("should open a peer", async function ()
    {
        this.timeout(5000);

        const peer = new JsonRpcPeer();
        await peer.open(
            `http://localhost:${ this.server.getCurrentPort() }`,
            {
                WebSocket,
            }
        );
        await peer.close();
    });

    it("should deal with repeated open and close calls", async function ()
    {
        this.timeout(5000);

        const peer = new JsonRpcPeer();
        for(let i = 0; i < 16; ++i)
        {
            try
            {
                await peer.open(
                    `http://localhost:${ this.server.getCurrentPort() }`,
                    {
                        WebSocket,
                    }
                );
            }
            catch(error)
            {
                // Ignore errors.
            }
            finally
            {
                await peer.close();
            }
        }
    });

    it("should deal with open failures", async function ()
    {
        this.timeout(5000);

        const peer = new JsonRpcPeer();
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
                // Ignore errors.
            }
            finally
            {
                await peer.close();
            }
        }
    });
};
