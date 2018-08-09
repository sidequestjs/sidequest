const path = require('path');
const Scheduler = require('./scheduler');
const Worker = require('./worker');
const os = require('os');
const events = require('events');

const defaultMaxSchedulers = os.cpus().length;

function MasterWorker () {
    let schedulers = [];
    let usedSchedulers = [];
    let maxSchedulers = defaultMaxSchedulers;

    // events setup 
    events.EventEmitter.call(this);

    while(schedulers.length < maxSchedulers){
        let scheduler = new Scheduler();
        scheduler.on('execution-requested', (task) => {
            console.log(`task ${task.name} requested execution!`)
            let worker = new Worker();
            worker.execute(task);
        });

        scheduler.on('registred', (task) => {
            this.emit('task-registred', task);
        });

        scheduler.on('died', (scheduler) => {
            console.error(`Scheduler ${scheduler.id()} died, finishing side-worker`);
            this.terminate();
        });

        schedulers.push(scheduler);
        console.log(`Scheduler created, id: ${scheduler.id()}`);
    }

    this.register = (task) => {
        task.path = path.resolve(task.path);
        let scheduler = schedulers.pop();
        usedSchedulers.push(scheduler);
        scheduler.register(task);

        if(schedulers.length == 0){
            schedulers = usedSchedulers;
            usedSchedulers = [];
        }
    }

    this.schedulers = () => {
        return usedSchedulers.concat(schedulers);
    }

    this.tasks = () => {
        return this.schedulers().reduce((allTasks, scheduler) => {
            return allTasks.concat(scheduler.tasks());
        }, []);
    }

    this.terminate = () => {
        this.schedulers().forEach(scheduler => {
            scheduler.terminate();
        });
    }
};
MasterWorker.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = MasterWorker;