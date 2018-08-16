'use strict';

const sidequest = require('../src/sidequest');
const { assert } = require('chai');

describe('sidequest', () => {
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
            }, terminate: (_) => {}
        };

        sidequest.use(plugin);
        sidequest.initialize();
    });

    it('should terminate a plugin', (done) => {
        let plugin = {
            initialize: (_) => {

            }, 
            terminate: (masterWorker) => {
                assert.isNotNull(masterWorker);
                done();
            }
        };

        sidequest.use(plugin);
        sidequest.initialize();
        sidequest.terminate();
    });
});