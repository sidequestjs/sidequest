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
        masterWorker = new MasterWorker();
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
    
    it('should execute a task', (done) => {
        masterWorker.register( {
            "name": "Write File",
            "path": "./test/test_assets/write_file.js",
            "cron": "* * * * * *"
        });
        
        setTimeout(() => {
            content = fs.readFileSync(testFile);
            assert.equal(content, "Temp File"); 
            done();
        }, 2000);
    });
});