const MasterWorker = require('../src/master-worker');
const { assert } = require('chai');
const cpus = require('os').cpus().length;
const fs = require('fs');

describe('MasterWorker', () => {
    let masterWorker;
    let testFile = ".temp_test.txt";
    
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
    
    it('should execute a task', (done) => {
        masterWorker.on('task-done', (task) => {
            assert.isNotNull(task);
            done();
        });

        masterWorker.register({
            "name": "Write File",
            "path": "./test/test_assets/write_file.js",
            "cron": "* * * * * *"
        });
    });

    it('should terminate all schedulers on scheduler fail', (done) => {
        masterWorker.terminate();
        masterWorker = new MasterWorker({totalSchedulers: 1});
        masterWorker.on('terminated',  () => {
            done();
        });

        masterWorker.register( {
            "name": "Write File",
            "path": "./test/test_assets/write_file.js",
            "cron": "* X * * * *"
        });
    });

    it('should terminate all workers', () => {
        masterWorker.terminate();
        masterWorker = new MasterWorker({totalSchedulers: 1});

        let task = {
            "name": "Write File",
            "path": "./test/test_assets/write_file.js",
            "cron": "* * * * * *"
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
                "name": "Write File",
                "path": "./test/test_assets/dummy_task.js",
                "cron": "* * * * * *"
            });
        }

        masterWorker.on('task-registred', () => {
            tasksRegistred++;
            if(tasksRegistred == 4){
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
});