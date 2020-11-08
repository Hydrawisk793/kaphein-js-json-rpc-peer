const { assert } = require("chai");

const { JsonRpcError } = require("../../../src");

module.exports = function ()
{
    it("should create without parameters", function ()
    {
        new JsonRpcError();
    });

    it("should create with a message", function ()
    {
        const message = "Foo";
        const err = new JsonRpcError(message);
        assert.equal(err.message, message);
        assert.isFalse(err.hasData());
        assert.isNull(err.data);
    });

    it("should create with a code", function ()
    {
        const code = -30000;
        const err = new JsonRpcError(code);
        assert.equal(err.code, code);
        assert.isFalse(err.hasData());
        assert.isNull(err.data);
    });

    it("should create with a code and a message", function ()
    {
        const code = -30000;
        const message = "Foo";
        const err = new JsonRpcError(code, message);
        assert.equal(err.message, message);
        assert.equal(err.code, code);
        assert.isFalse(err.hasData());
        assert.isNull(err.data);
    });

    it("should create with a code, a message and data", function ()
    {
        const code = -30000;
        const message = "Foo";
        const data = {
            foo : {
                bar : 1,
            },
            baz : false,
        };
        const err = new JsonRpcError(code, message, data);
        assert.equal(err.message, message);
        assert.equal(err.code, code);
        assert.isTrue(err.hasData());
        assert.deepStrictEqual(err.data, data);
    });

    it("should copy construct", function ()
    {
        const lhs = new JsonRpcError(-30000, "foo", { foo : 3, bar : { baz : false, }, });
        const rhs = new JsonRpcError(lhs);
        assert.equal(rhs.code, lhs.code);
        assert.equal(rhs.message, lhs.message);
        assert.equal(rhs.hasData(), lhs.hasData());
        assert.deepStrictEqual(rhs.data, lhs.data);
    });
};
