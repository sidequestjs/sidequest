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
        worker.on('done', (task, result) => {
            assert.isNotNull(task);
            assert.equal(result, "dummy task!");
            done()
        });
        worker.execute();
    });

    it("should done a task with error", (done) => {
        worker.terminate();
        worker = new Worker({
            "name": "Task",
            "path": path.resolve("./test/test_assets/dummy_task_error.js"),
            "cron": "* * * * * *"
        });
        worker.on('error', (task, error) => {
            assert.isNotNull(task);
            assert.equal(error, "dummy error");
            done()
        });
        worker.execute();
    });

    it("should done a task that returns a primise", (done) => {
        worker.terminate();
        worker = new Worker({
            "name": "Task",
            "path": path.resolve("./test/test_assets/promise-task.js"),
            "cron": "* * * * * *"
        });
        worker.on('done', (task, result) => {
            assert.isNotNull(task);
            assert.equal(result, "async task!");
            done()
        });
        worker.execute();
    });

    it("should done a task thar return a promise and with error", (done) => {
        worker.terminate();
        worker = new Worker({
            "name": "Task",
            "path": path.resolve("./test/test_assets/promise-task-error.js"),
            "cron": "* * * * * *"
        });
        worker.on('error', (task, error) => {
            assert.isNotNull(task);
            assert.equal(error, "async error");
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
