'use strict';

exports.run = () => {
    return new Promise((_, reject) => {
       reject('async error'); 
    });
};