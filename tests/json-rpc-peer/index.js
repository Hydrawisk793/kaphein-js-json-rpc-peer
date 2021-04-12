const { TestServer } = require("../test-server");

module.exports = function ()
{
    before(async function ()
    {
        const serverPort = 0;

        const server = new TestServer();
        await server.open(serverPort);

        this.server = server;
    });

    after(async function ()
    {
        const server = this.server;
        if(server)
        {
            await server.close();
        }
    });

    describe("open", require("./suites/open.test").bind(this));
    describe("rpc-handler", require("./suites/rpc-handler.test").bind(this));
    describe("rpc-call", require("./suites/rpc-call.test").bind(this));
    describe("multiple-rpc-call", require("./suites/multiple-rpc-call.test").bind(this));
    describe("notification", require("./suites/notification.test").bind(this));
    describe("waitFor", require("./suites/wait-for.test").bind(this));
};
