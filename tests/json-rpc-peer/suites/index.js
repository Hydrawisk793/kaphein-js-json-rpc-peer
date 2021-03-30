module.exports = function ()
{
    require("./open.test")();
    require("./rpc-call.test")();
    require("./multiple-rpc-call.test")();
    require("./notification.test")();
};
