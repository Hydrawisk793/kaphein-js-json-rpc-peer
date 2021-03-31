module.exports = function ()
{
    describe("constructor", require("./suites/constructor.test").bind(this));
    describe("assign", require("./suites/assign.test").bind(this));
};
