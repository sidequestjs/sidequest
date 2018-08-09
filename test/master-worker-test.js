const MasterWorker = require('../src/master-worker');
const { assert } = require('chai');
const cpus = require('os').cpus().length;

describe('MasterWorker', () => {
    let masterWorker;
    
    beforeEach(() => {
        masterWorker = new MasterWorker();
    });
    
    afterEach(() => {
        masterWorker.terminate();
    });
    
    it('should generate schedulers', () => {
        assert.lengthOf(masterWorker.schedulers(), cpus);
    });
    
    it('should register tasks', (done) => {
        masterWorker.on('task-registred', (task) => {
            let tasks = masterWorker.tasks();
            assert.lengthOf(tasks, 1);
            done();
        });

        masterWorker.register( {
            "name": "Dummy Task",
            "path": "./test/test_assets/dummy_task.js",
            "cron": "* * * * *"
        });
    });
});