const http = require("http");
const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;
const { ulid } = require("ulid");
const { StringKeyMap } = require("kaphein-js");

const {
    JsonRpcPeer,
    JsonRpcError,
    JsonRpcPredefinedErrorCode,
} = require("../../src");

module.exports = (function ()
{
    /**
     *  @typedef {import("http").Server} HttpServer
     *  @typedef {ReturnType<typeof setTimeout>} Timeout
     */

    class TestServer
    {
        constructor()
        {
            /** @type {HttpServer} */this._server = null;
            /** @type {WebSocketServer} */this._wsServer = null;
            this._sessions = new StringKeyMap(/** @type {Iterable<[string, Session]>} */(null));

            this._wsOnConnection = _wsOnConnection.bind(this);
        }

        /**
         *  @param {number} port
         */
        async open(port)
        {
            const server = http.createServer();
            this._server = server;

            const wsServer = new WebSocketServer({
                server,
            });
            this._wsServer = wsServer;
            wsServer.on("connection", this._wsOnConnection);

            return new Promise(function (resolve, reject)
            {
                server.listen(port, function(error)
                {
                    if(error)
                    {
                        reject();
                    }
                    else
                    {
                        resolve();
                    }
                });
            });
        }

        async close()
        {
            const server = this._server;
            this._server = null;
            if(server)
            {
                await new Promise(function (resolve)
                {
                    server.close(function ()
                    {
                        resolve();
                    });
                });
            }
        }
    }

    /**
     *  @this {TestServer}
     *  @param {WebSocket} ws
     */
    function _wsOnConnection(ws)
    {
        new Session(this).open(ws);
    }

    class Session
    {
        /**
         *  @param {TestServer} server
         */
        constructor(server)
        {
            this._id = ulid();
            this._server = server;
            /** @type {JsonRpcPeer} */this._peer = new JsonRpcPeer();

            /** @type {Timeout} */this._timer = null;
            this._timerValue = 0;
        }

        getId()
        {
            return this._id;
        }

        /**
         *  @param {WebSocket} ws
         */
        async open(ws)
        {
            try
            {
                this._server._sessions.set(this._id, this);

                const peer = new JsonRpcPeer();
                this._peer = peer;
                peer.once("closed", function ()
                {
                    console.debug("[REMOTE]", "closed");
                });
                peer.once("errorOccurred", function (e)
                {
                    console.error("[REMOTE]", e.error);
                });

                peer.setRpcHandler("add", function (peer, req)
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
                peer.setRpcHandler("subtract", function (peer, req)
                {
                    if(!Array.isArray(req.params))
                    {
                        throw new JsonRpcError(
                            JsonRpcPredefinedErrorCode.INVALID_PARAMS,
                            "'params' must be an array of numbers."
                        );
                    }

                    return req.params[0] - req.params[1];
                });
                peer.setRpcHandler("startTimer", (peer, req) =>
                {
                    const result = null === this._timer;
                    if(null === this._timer)
                    {
                        const {
                            interval,
                        } = req.params;

                        this._timerValue = 0;
                        const handler = () =>
                        {
                            this._peer.notify({
                                method : "onTimer",
                                params : {
                                    value : this._timerValue++,
                                },
                            });

                            this._timer = setTimeout(handler, interval);
                        };

                        this._timer = setTimeout(handler, interval);
                    }

                    return result;
                });
                peer.setRpcHandler("stopTimer", (peer, req) =>
                {
                    peer;
                    req;

                    const timer = this._timer;
                    this._timer = null;
                    const result = null !== timer;
                    if(result)
                    {
                        clearTimeout(timer);
                    }

                    return result;
                });

                await peer.open(ws);
            }
            catch(error)
            {
                setTimeout(() =>
                {
                    try
                    {
                        this.close();
                    }
                    catch(error)
                    {
                        // Ignore errors.
                    }
                });

                throw error;
            }
        }

        async close()
        {
            this._server._sessions["delete"](this._id);

            const peer = this._peer;
            this._peer = null;
            if(peer)
            {
                try
                {
                    await peer.close();
                }
                catch(error)
                {
                    // Ignore errors.
                }
            }
        }
    }

    return {
        TestServer,
    };
})();
