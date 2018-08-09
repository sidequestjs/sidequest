const Scheduler = require('../src/scheduler');
const { assert } = require('chai');

describe('Scheduler', () => {
    let scheduler;
    
    beforeEach(() => {
        scheduler = new Scheduler();
    });

    afterEach(() => {
        scheduler.terminate();
    });

    it('should have an id', () => {
        assert.isNotEmpty(scheduler.id());
    });
    it('should have an pid', () => {
        assert.isNotEmpty(scheduler.pid());
    });

    it('should respond to isDead', () => {
        scheduler.terminate();
        assert.isTrue(scheduler.isDead());
    });

    it('should respond to isAlive', () => {
        assert.isTrue(scheduler.isAlive());
    });

    it('should register a task', (done) => {
        scheduler.on('registred', (task) => {
            assert.isNotNull(task);
            done();
        });
        scheduler.register( {
            "name": "Task",
            "path": "./test/test_assets/dummy_task.js",
            "cron": "* * * * * *"
        });
    });

    it('should return tasks', (done) => {
        scheduler.on('registred', (task) => {
            assert.lengthOf(scheduler.tasks(), 1);
            done();
        });
        scheduler.register( {
            "name": "Task",
            "path": "./test/test_assets/dummy_task.js",
            "cron": "* * * * * *"
        });
    });

    it('should return imutable tasks', (done) => {
        scheduler.on('registred', (task) => {
            scheduler.tasks().push({});
            assert.lengthOf(scheduler.tasks(), 1);
            done();
        });
        scheduler.register( {
            "name": "Task",
            "path": "./test/test_assets/dummy_task.js",
            "cron": "* * * * * *"
        });
    });

    it('should request a tasks execution', (done) => {
        scheduler.on('execution-requested', (task) => {
            assert.isNotNull(task);
            done();
        });
        scheduler.register( {
            "name": "Task",
            "path": "./test/test_assets/dummy_task.js",
            "cron": "* * * * * *"
        });
    });

    it('should emmit died event', (done) => {
        scheduler.on('died', (s) => {
            assert.equal(s.id(), scheduler.id());
            done();
        });
        scheduler.register( {
            "name": "Task",
            "path": "./test/test_assets/dummy_task.js",
            "cron": "* X * * * *"
        });
    });
});

