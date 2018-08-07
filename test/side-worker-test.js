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
            assert.lengthOf(sideWorker.sharedWorkers(), 3);
        });

        it('should load a exclusive worker for a task', () => {
            assert.lengthOf(sideWorker.exclusiveWorkers(), 1);
        });

        it('should start a task', (done) => {   
            sideWorker.sharedWorkers()[0].on('started', (task) => {
                assert.isNotNull(task);
                done();
            });
        });

        it('should done a task', (done) => {   
            sideWorker.sharedWorkers()[0].on('done', (task) => {
                assert.isNotNull(task);
                done();
            });
        });
    });

    describe('passing a config file', () => {
        it('should receive a config file', () => {
            sideWorker.initialize('../test/test_assets/config-test.json');
        });

        it('should create a singe worker', ()=>{
            assert.lengthOf(sideWorker.sharedWorkers(), 1);
        })
    });
});