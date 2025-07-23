const sidequest = require('../src/sidequest');
const { assert } = require('chai');

describe('side-worker', () => {
    it('should initilize', () => {
        sidequest.initialize();
        assert.lengthOf(sidequest.masterWorker().schedulers(), 2);
        sidequest.terminate();
    });

    it('should initialize a plugin', (done) => {
        let plugin = {
            initialize: (masterWorker) => {
                assert.isNotNull(masterWorker);
                sidequest.terminate();
                done();
            }, terminate: () => {}
        }

        sidequest.use(plugin);
        sidequest.initialize();
    })

    it('should terminate a plugin', (done) => {
        let plugin = {
            initialize: () => {}, 
            terminate: (masterWorker) => {
                assert.isNotNull(masterWorker);
                done();
            }
        }

        sidequest.use(plugin);
        sidequest.initialize();
        sidequest.terminate();
    })
});