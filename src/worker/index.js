const { fork } = require('child_process');
const events = require('events');

const daemonPath = `${__dirname}/daemon.js`;

function Worker() {
    const process = fork(daemonPath);
    const tasks = [];

    events.EventEmitter.call(this);

    process.on('message', (message) => {
        if(message.type == 'task-registred') {
            tasks.push(message.task);
            this.emit('task-registred', task);
        }
    });

    this.register = (task) => {
        process.send({
            type: 'taks-registration',
            task: task
        });
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