const { fork } = require('child_process');
const events = require('events');
const path = require('path');

const id = require('../id');

const daemonPath = `${__dirname}/daemon.js`;

function Worker(type) {
    const process = fork(daemonPath);
    const tasks = [];
    const workerId = id.generate();
    
    if(!type){
        type = Worker.SHARED_TYPE;
    }
    
    events.EventEmitter.call(this);
    
    process.on('message', (message) => {
        switch (message.type){
            case 'task-registred':
            this.emit('task-registred', message.task);
            break;
            case 'started':
            this.emit('started', message.task);
            break;
            case 'done':
            this.emit('done', message.task);
            break;
        }
        
    });
    
    this.register = (task) => {
        if(type === Worker.EXCLUSIVE_TYPE && tasks.length > 0){
            throw "Connot register task! Exclusive Worker may register only one task!";
        }
        tasks.push(task);
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
Worker.EXCLUSIVE_TYPE = 'exclusive';
Worker.SHARED_TYPE = 'shared';
module.exports = Worker;