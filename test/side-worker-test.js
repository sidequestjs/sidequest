const config = '../test/test_assets/confing.json'
const { assert } = require('chai');


describe('side-worker', ()=>{
    let sideWorker;
    beforeEach(() => {
        sideWorker = require('../src/side-worker');
    });

    afterEach(() => {
        sideWorker.terminate();
    });   

    describe('with side-worker-config.json', () => { 
        beforeEach(() => {
            sideWorker.initialize();
        });

        it('should load a config file from current folder', () => {
            assert.lengthOf(sideWorker.workers(), 3);
        });
    });

    describe('passing a config file', () => {
        it('should receive a config file', () => {
            sideWorker.initialize('../config-test.json');
        });

        it('should create a singe worker', ()=>{
            assert.lengthOf(sideWorker.workers(), 1);
        })
    });
});