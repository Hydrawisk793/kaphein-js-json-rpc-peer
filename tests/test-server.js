const http = require("http");
const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;
const { ulid } = require("ulid");
const { isString } = require("kaphein-js-type-trait");
const { StringKeyMap } = require("kaphein-js-collection");

const {
    JsonRpcPeer,
    JsonRpcError,
    JsonRpcPredefinedErrorCode,
    JsonRpcPeerState,
} = require("../src");

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

        getCurrentPort()
        {
            return (this._server ? this._server.address().port : null);
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
            /** @type {JsonRpcPeer} */this._peer = null;
            this._timeoutCtxMap = new StringKeyMap();

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
                // peer.once("closed", function ()
                // {
                //     console.debug("[REMOTE]", "closed");
                // });
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
                            this._peer.request({
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
                peer.setRpcHandler("notifyAfter", (peer, req) =>
                {
                    const { id, timeoutInMs } = req.params;

                    if(!isString(id))
                    {
                        throw new TypeError("'id' must be a string.");
                    }
                    if(this._timeoutCtxMap.get(id))
                    {
                        throw new Error(`${ id } already exists.`);
                    }

                    if(!Number.isSafeInteger(timeoutInMs))
                    {
                        throw new TypeError("'timeoutInMs' must be a safe-integer.");
                    }

                    this._timeoutCtxMap.set(
                        id,
                        {
                            id,
                            timeout : setTimeout(() =>
                            {
                                this._timeoutCtxMap["delete"](id);

                                if(JsonRpcPeerState.OPENED === this._peer.getState())
                                {
                                    this._peer.request({
                                        method : "notifyAfter",
                                        params : {
                                            id,
                                            timeoutInMs,
                                            timestamp : new Date().getTime(),
                                        },
                                    });
                                }
                            }, timeoutInMs),
                        }
                    );

                    return null;
                });

                await peer.open(ws);
            }
            catch(error)
            {
                setTimeout(async () =>
                {
                    try
                    {
                        await this.close();
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
            this._timeoutCtxMap.forEach(function (ctx)
            {
                clearTimeout(ctx.timeout);
            });
            this._timeoutCtxMap.clear();

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
