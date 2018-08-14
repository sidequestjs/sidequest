'use strict';

exports.run = () => {
    return new Promise((resolve) => {
        resolve('async task!');
    });
};