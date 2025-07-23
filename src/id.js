const nanoid = require('nanoid/generate');
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

module.exports = (() => {
    function generate(){
        return nanoid(alphabet, 25);
    }
    return {
       generate: generate 
    }
})();