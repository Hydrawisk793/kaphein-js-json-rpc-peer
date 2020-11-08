module.exports = (function ()
{
    /**
     *  @param {number} ms
     */
    function wait(ms)
    {
        return new Promise(function (resolve)
        {
            setTimeout(resolve, ms);
        });
    }

    return {
        wait,
    }
})();
