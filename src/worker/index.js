const { fork } = require('child_process');
const events = require('events');
const path = require('path');

const id = require('../id');

const daemonPath = `${__dirname}/daemon.js`;

function Worker() {
    const process = fork(daemonPath);
    const tasks = [];
    const workerId = id.generate();

    events.EventEmitter.call(this);

    process.on('message', (message) => {
        if(message.type == 'task-registred') {
            tasks.push(message.task);
            this.emit('task-registred', task);
        }
    });

    this.register = (task) => {
        task.path = path.resolve(task.path);
        task.id = id.generate();
        process.send({
            type: 'taks-registration',
            task: task
        });
    }

    this.id = () => {
        return workerId;
    }

    this.pid = () => {
        return process.pid.toString();
    }

    this.tasks = () => {
        return tasks.slice(0);
    }

    this.kill = () => {
        process.kill();
    }

    this.isDead = () => {
        return process.killed;
    }

    this.isAlive = () => {
        return !this.isDead();
    }
}

Worker.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = Worker;