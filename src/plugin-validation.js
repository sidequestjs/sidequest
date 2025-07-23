module.exports = (() => {
    /**
     * validate if a plugin has the functions initialize and terminate
     * @param {*} plugin 
     */
    function validate(plugin){
        if(typeof plugin.initialize !== 'function' || plugin.initialize.length !== 1){
            throw "a pluging must have a function initialize receiving one argument!"
        }

        if(typeof plugin.terminate !== 'function' || plugin.terminate.length !== 1){
            throw "a pluging must have a function terminate receiving one argument!"
        }
    }

    return {
        validate: validate
    }
})();