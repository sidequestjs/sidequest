const { assert } = require('chai');
const Worker = require('../../src/worker');
const path = require('path');

describe('Worker', () => {
    let worker;
    
    beforeEach(() => {
        worker = new Worker();
    });
    
    afterEach(() => {
        if(worker.isAlive())
        worker.kill();
    });
    
    it('should be alive', () => {
        assert.isTrue(worker.isAlive());
        assert.isFalse(worker.isDead());
    });
    
    it('should be killed', () => {
        worker.kill();
        assert.isTrue(worker.isDead());
        assert.isFalse(worker.isAlive());
    });

    it('should have an id', () => {
        assert.isNotEmpty(worker.id());
    });

    it('should have a pid', () => {
        assert.isNotEmpty(worker.pid());
    });
    
    it('should register a task', (done)=>{
        task = {
            "name": "Dummy Task",
            "path": path.resolve(__dirname, '../test_assets/dummy_task.js'),
            "cron": "* * * * *"
        }

        worker.on('task-registred', (task) => {
            assert.equal(worker.tasks().length, 1);
            assert.isNotEmpty(task.id);
            done();
        });
        worker.register(task);
    });

    it('tasks should be imutable', ()=>{
        worker.tasks().push({});
        assert.equal(worker.tasks().length, 0);
    });
});