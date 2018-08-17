'use strict';

const MasterWorker = require('../src/master-worker');
const { assert } = require('chai');
const cpus = require('os').cpus().length;
const fs = require('fs');

describe('MasterWorker', () => {
    let masterWorker;
    let testFile = '.temp_test.txt';
    
    beforeEach(() => {
        if(fs.existsSync(testFile)){
            fs.unlinkSync(testFile, function(err) {
                if(err) {
                    return console.log(err);
                }
            });
        }
        masterWorker = new MasterWorker({totalSchedulers: 2});
    });
    
    afterEach(() => {
        masterWorker.terminate();
        if(fs.existsSync(testFile)){
            fs.unlinkSync(testFile, function(err) {
                if(err) {
                    return console.log(err);
                }
            });
        }
    });
    
    it('should generate schedulers', () => {
        masterWorker.terminate();
        masterWorker = new MasterWorker();
        assert.lengthOf(masterWorker.schedulers(), cpus);
    });

    it('should respont to startedAt', () => {
        assert.isNotNull(masterWorker.startedAt());
        assert.instanceOf(masterWorker.startedAt(), Date);
    });

    it('should respont to id', () => {
        assert.isNotNull(masterWorker.id());
    });
    
    
    it('should register tasks', (done) => {
        masterWorker.on('task-registred', () => {
            let tasks = masterWorker.tasks();
            assert.lengthOf(tasks, 1);
            done();
        });
        
        masterWorker.register( {
            'name': 'Dummy Task',
            'path': './test/test_assets/dummy_task.js',
            'cron': '* * * * *'
        });
    });
    
    it('should execute a task', (done) => {
        masterWorker.on('task-done', (task) => {
            assert.isNotNull(task);
            done();
        });

        masterWorker.register({
            'name': 'Write File',
            'path': './test/test_assets/write_file.js',
            'cron': '* * * * * *'
        });
    });

    it('should terminate all workers', () => {
        masterWorker.terminate();
        masterWorker = new MasterWorker({totalSchedulers: 1});

        let task = {
            'name': 'Write File',
            'path': './test/test_assets/write_file.js',
            'cron': '* * * * * *'
        };
        masterWorker.register( task );
        
        let scheduler = masterWorker.schedulers()[0];
        scheduler.emit('execution-requested', task);
        assert.lengthOf(masterWorker.currentWorkers(), 1);
        masterWorker.terminate();
        assert.isTrue(masterWorker.currentWorkers()[0].isDead());
    });


    it('should distribute tasks', (done) => {
        masterWorker.terminate();
        masterWorker = new MasterWorker({totalSchedulers: 2});
        
        let tasksRegistred = 0;
        
        for(let i = 0; i < 4; i++){
            masterWorker.register( {
                'name': 'Write File',
                'path': './test/test_assets/dummy_task.js',
                'cron': '* * * * * *'
            });
        }

        masterWorker.on('task-registred', () => {
            tasksRegistred++;
            if(tasksRegistred === 4){
                masterWorker.schedulers().forEach((scheduler) => {
                    assert.lengthOf(scheduler.tasks(), 2);
                });
                done();
            }
        });
    });

    it('should generate schedulers with totalSchedulers setted', () => {
        masterWorker.terminate();
        masterWorker = new MasterWorker({totalSchedulers: 2});
        assert.lengthOf(masterWorker.schedulers(), 2);
    });


    it('should receive the result on done event', (done) => {
        masterWorker.terminate();
        masterWorker = new MasterWorker({totalSchedulers: 1});

        masterWorker.on('task-done', (task, result) =>{
            assert.isNotNull(task);
            assert.equal(result, 'async task!');
            done();
        });

        let task = {
            'name': 'Write File',
            'path': './test/test_assets/promise-task.js',
            'cron': '* * * * * *'
        };
        masterWorker.register( task );
    });

    it('should receive the result on error event', (done) => {
        masterWorker.terminate();
        masterWorker = new MasterWorker({totalSchedulers: 1});

        masterWorker.on('task-error', (task, error) =>{
            assert.isNotNull(task);
            assert.equal(error, 'async error');
            done();
        });

        let task = {
            'name': 'Write File',
            'path': './test/test_assets/promise-task-error.js',
            'cron': '* * * * * *'
        };
        masterWorker.register( task );
    });

    it('should prevent a task to be executed twice simultaneously', (done) => {
        masterWorker.terminate();
        masterWorker = new MasterWorker({totalSchedulers: 1});
        let executions = 0;
        masterWorker.on('task-done', (task, result) =>{
            executions++;
            assert.isNotNull(task);
            assert.equal(result, 'slow task executed');
            assert.equal(executions, 1);
            done();
        });

        let task = {
            'name': 'Write File',
            'path': './test/test_assets/slow-task.js',
            'cron': '* * * * * *'
        };
        masterWorker.register( task );
    });

    it('should allows a task to be executed twice simultaneously with unsafe setted to true', (done) => {
        masterWorker.terminate();
        masterWorker = new MasterWorker({totalSchedulers: 1});
        let executions = 0;
        let doneCalled = false;
        masterWorker.on('task-done', (task, result) =>{
            executions++;
            if(executions == 2 && !doneCalled){
                assert.isNotNull(task);
                assert.equal(result, 'slow task executed');
                assert.isAtLeast(executions, 2);
                doneCalled = true;
                done();
            }
        });

        let task = {
            'name': 'Write File',
            'path': './test/test_assets/slow-task.js',
            'cron': '* * * * * *',
            'unsafe': true
        };
        masterWorker.register( task );
    });
});