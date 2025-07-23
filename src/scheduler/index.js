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

    forkProcess.on('exit', (code) => {
       if(code == 1){
           this.emit('died', this);
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

    this.terminate = () => {
        if(forkProcess.connected){
            forkProcess.disconnect();
        }
    }
    
    this.isDead = () => {
        return !this.isAlive();
    }
    
    this.isAlive = () => {
        return forkProcess.exitCode == null;
    }

    this.tasks = () => {
        return tasks.slice(0);
    }
}

Scheduler.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = Scheduler;