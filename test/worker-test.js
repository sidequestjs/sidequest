const Worker = require('../src/worker');
const { assert } = require('chai');
const path = require('path');

describe("Worker", () => {
    let worker;
    
    beforeEach(() => {
        worker = new Worker({
            "name": "Task",
            "path": path.resolve("./test/test_assets/dummy_task.js"),
            "cron": "* * * * * *"
        });
    });

    afterEach(() => {
        worker.terminate();
    });

    it("should have an id", () => {
        assert.isNotEmpty(worker.id());
    });

    it("should have an pid", () => {
        assert.isNotEmpty(worker.pid());
    });

    it("should have a task", () => {
        assert.isNotNull(worker.task());
        assert.equal(worker.task().name, "Task");
    });

    it("should start a task", (done) => {
        worker.on('started', (task) => {
            assert.isNotNull(task);
            done();
        });
        worker.execute();
    });
    it("should done a task", (done) => {
        worker.on('done', (task) => {
            assert.isNotNull(task);
            done()
        });
        worker.execute();
    });
    
    it("should have to be killed", (done) => {
        worker.on('done', (task) => {
            done(new Error("Fail, task was finished!"));
        });
        worker.execute( {
            "name": "Task",
            "path": path.resolve("./test/test_assets/dummy_task.js"),
            "cron": "* * * * * *"
        });
        assert.isTrue(worker.isAlive());
        worker.terminate();
        assert.isTrue(worker.isDead());
        done();
    });
});
