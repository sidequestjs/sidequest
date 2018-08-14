'use strict';

const nanoid = require('nanoid/generate');
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
/**
 * id module is used to encapsulate all the id generation
 */
module.exports = (() => {
    /**
     * generate returns an unique id
     * @returns string
     */
    function generate(){
        return nanoid(alphabet, 25);
    }
    return {
       generate: generate 
    };
})();