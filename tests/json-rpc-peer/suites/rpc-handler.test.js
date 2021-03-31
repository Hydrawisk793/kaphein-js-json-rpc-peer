const { expect } = require("chai");

const {
    JsonRpcPeer,
    JsonRpcPredefinedErrorCode,
    JsonRpcError,
} = require("../../../src");

module.exports = function ()
{
    /**
     *  @typedef {import("../../../src").JsonRpcFunction} JsonRpcFunction
     */

    const handlers = {
        /**
         *  @type {JsonRpcFunction}
         */
        "add" : function (context, req)
        {
            const {
                params,
            } = req;

            if(!Array.isArray(params))
            {
                throw new JsonRpcError(
                    JsonRpcPredefinedErrorCode.INVALID_PARAMS,
                    "'params' must be an array of numbers."
                );
            }

            return params[0] + params[1];
        },

        /**
         *  @type {JsonRpcFunction}
         */
        "subtract" : function (context, req)
        {
            const {
                params,
            } = req;

            if(!Array.isArray(params))
            {
                throw new JsonRpcError(
                    JsonRpcPredefinedErrorCode.INVALID_PARAMS,
                    "'params' must be an array of numbers."
                );
            }

            return params[0] - params[1];
        },
    };

    it("should set a RPC handler.", function ()
    {
        const peer = new JsonRpcPeer();

        peer.setRpcHandler("add", handlers.add);
        expect(peer.getRpcHandler("add")).to.equal(handlers.add);
    });

    it("should not allow setting different RPC handlers for a same method name.", function ()
    {
        const peer = new JsonRpcPeer();

        peer.setRpcHandler("add", handlers.add);
        expect(() => peer.setRpcHandler("add", handlers.add)).to.not.throw();
        expect(() => peer.setRpcHandler("add", handlers.subtract)).to.throw();
    });

    it("should remove a specified handler.", function ()
    {
        const peer = new JsonRpcPeer();

        peer.setRpcHandler("add", handlers.add);
        expect(peer.getRpcHandler("add")).to.equal(handlers.add);

        peer.removeRpcHandler("add");
        expect(peer.getRpcHandler("add")).to.be.null;
    });
};
