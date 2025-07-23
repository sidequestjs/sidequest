const { fork } = require('child_process');
const events = require('events');

const id = require('../id');

const daemonPath = `${__dirname}/daemon.js`;

function Worker() {
    const forkProcess = fork(daemonPath);
    const workerId = id.generate();
    
    events.EventEmitter.call(this);
    
    forkProcess.on('message', (message) => {
        switch(message.type){ 
            case 'execution-started':
                this.emit('started', message.data);
                break;
            case 'execution-done':
                forkProcess.kill();
                this.emit('done', message.data);
                break;
        }
    });
    
    this.execute = (task) => {
        forkProcess.send({
            type: 'execute',
            data: task
        });
    }
    
    this.id = () => {
        return workerId;
    }
    
    this.pid = () => {
        return forkProcess.pid.toString();
    }
    
    this.terminate = () => {
        forkProcess.kill();
    }
    
    this.isDead = () => {
        return forkProcess.killed;
    }
    
    this.isAlive = () => {
        return !this.isDead();
    }
}

Worker.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = Worker;