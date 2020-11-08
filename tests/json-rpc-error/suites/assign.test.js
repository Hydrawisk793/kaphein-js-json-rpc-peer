const { assert } = require("chai");

const { JsonRpcError } = require("../../../src");

module.exports = function ()
{
    it("should assign an other instance", function ()
    {
        const lhs = new JsonRpcError(-30000, "foo", { foo : 3, bar : { baz : false, }, });
        const rhs = new JsonRpcError();
        rhs.assign(lhs);
        assert.equal(rhs.code, lhs.code);
        assert.equal(rhs.message, lhs.message);
        assert.equal(rhs.hasData(), lhs.hasData());
        assert.deepStrictEqual(rhs.data, lhs.data);
    });

    it("should assign a JSON object", function ()
    {
        const err = new JsonRpcError();
        const errJsons = [
            {
                code : -30000,
                message : "foo",
                data : { foo : 3, bar : { baz : false, }, },
            },
            {
                code : -30001,
                message : "bar",
                data : null,
            },
            {
                code : -30002,
                message : "baz",
                data : { qux : "quuuux", },
            },
        ];
        errJsons.forEach(function (errJson)
        {
            err.assignJson(errJson);
            assert.equal(err.code, errJson.code);
            assert.equal(err.message, errJson.message);
            assert.equal(err.hasData(), ("data" in errJson));
            assert.deepStrictEqual(err.data, errJson.data);
        });
    });
};
