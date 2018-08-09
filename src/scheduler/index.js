const { fork } = require('child_process');
const events = require('events');
const id = require('../id');

const daemonPath = `${__dirname}/daemon.js`;

function Scheduler(){
    const forkProcess = fork(daemonPath);
    const tasks = [];
    const schedulerId = id.generate();
    
    // events setup 
    events.EventEmitter.call(this);
    
    forkProcess.on('message', (message) => {
        switch(message.type){ 
            case 'registred':
                tasks.push(message.data);
                this.emit('registred', message.data);
                break;
            case 'execution-request':
                this.emit('execution-requested', message.data);
                break;
        }
    });
    

    this.register = (task) => {
        forkProcess.send({ type: 'register', data: task });
    };

    this.id = () => {
        return schedulerId;
    }

    this.pid = () => {
        return forkProcess.pid.toString();;
    }

    this.kill = () => {
        forkProcess.kill();
    }
    
    this.isDead = () => {
        return forkProcess.killed;
    }
    
    this.isAlive = () => {
        return !this.isDead();
    }
}

Scheduler.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = Scheduler;