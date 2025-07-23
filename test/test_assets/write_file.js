'use strict';

const fs = require('fs');
const path = require('path');

exports.run = () => {
    fs.writeFileSync('.temp_test.txt', 'Temp File', function(err) {
        if(err) {
            return console.log(err);
        }
        console.log(path.resolve('.temp_test.txt'));
    });
};