const sideWorker = require('../src/side-worker');
const { assert } = require('chai');

describe('side-worker', () => {
    it('should initilize', () => {
        sideWorker.initialize();
        assert.lengthOf(sideWorker.masterWorker().schedulers(), 2);
        sideWorker.terminate();
    });
});