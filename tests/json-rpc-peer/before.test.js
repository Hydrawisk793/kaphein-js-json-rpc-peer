const {
    TestServer,
} = require("./test-server");

before(async function ()
{
    const serverPort = 3000;

    const server = new TestServer();
    await server.open(serverPort);

    this.server = server;
});
