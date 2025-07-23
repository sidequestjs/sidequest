const path = require('path');
const Scheduler = require('./scheduler');
const Worker = require('./worker');
const os = require('os');
const events = require('events');

const defaultMaxSchedulers = os.cpus().length;

/**
 * MasterWorker is the responsable to manage all the schedulers, 
 * it register the tasks and delegate the executions to the workers
 */
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

    /**
     * register adds a task to the scheduled tasks
     * @param {*} task 
     */
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

    /**
     * schedulers returns all the created schedulers
     * @returns {array}
     */
    this.schedulers = () => {
        return usedSchedulers.concat(schedulers);
    }

    /**
     * tasks returns all the registred tasks
     * @returns {array}
     */
    this.tasks = () => {
        return this.schedulers().reduce((allTasks, scheduler) => {
            return allTasks.concat(scheduler.tasks());
        }, []);
    }

    /**
     * terminate is responsible to terminate all the schedulers
     */
    this.terminate = () => {
        this.schedulers().forEach(scheduler => {
            scheduler.terminate();
        });
    }
};
MasterWorker.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = MasterWorker;