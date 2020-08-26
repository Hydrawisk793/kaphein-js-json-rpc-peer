const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;
const http = require("http");

const {
    JsonRpcPeer,
    JsonRpcError,
    JsonRpcPredefinedErrorCode,
} = require("../../src");

before(function ()
{
    const serverPort = 3000;
    const server = http.createServer();
    const wsServer = new WebSocketServer({
        server,
    });
    wsServer.on("connection", function (ws)
    {
        const rpcPeer = new JsonRpcPeer();
        rpcPeer.once("closed", function ()
        {
            console.debug("[REMOTE]", "closed");
        });
        rpcPeer.once("errorOccurred", function (e)
        {
            console.error("[REMOTE]", e.error);
        });
        rpcPeer.setRpcFunction("add", function (peer, req)
        {
            if(!Array.isArray(req.params))
            {
                throw new JsonRpcError(
                    JsonRpcPredefinedErrorCode.INVALID_PARAMS,
                    "'params' must be an array of numbers."
                );
            }

            return req.params[0] + req.params[1];
        });
        rpcPeer.setRpcFunction("subtract", function (peer, req)
        {
            if(!Array.isArray(req.params))
            {
                throw new JsonRpcError(
                    JsonRpcPredefinedErrorCode.INVALID_PARAMS,
                    "'params' must be an array of numbers."
                );
            }

            return req.params[0] + req.params[1];
        });
        rpcPeer.open(ws);
    });
    server.listen(serverPort);

    this.server = server;
});
