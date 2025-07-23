const path = require('path');
const Scheduler = require('./scheduler');
const Worker = require('./worker');
const os = require('os');

const defaultMaxSchedulers = os.cpus().length;

module.exports = (() => {
    let schedulers = [];
    let usedSchedulers = [];
    let maxSchedulers = defaultMaxSchedulers;

    while(schedulers.length < maxSchedulers){
        let scheduler = new Scheduler();
        scheduler.on('execution-requested', (task) => {
            console.log(`task ${task.name} requested execution!`)
            let worker = new Worker();
            worker.execute(task);
        });
        schedulers.push(scheduler);
        console.log(`Scheduler created, id: ${scheduler.id()}`);
    }

    function register(task){
        task.path = path.resolve(task.path);
        let scheduler = schedulers.pop();
        usedSchedulers.push(scheduler);

        scheduler.register(task);

        if(schedulers.length == 0){
            schedulers = usedSchedulers;
            usedSchedulers = [];
        }
    }

    return {
        register: register
    }
})();