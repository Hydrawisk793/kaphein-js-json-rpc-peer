const { TestServer } = require("../test-server");
const suites = require("./suites");

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

    suites(this);
};
