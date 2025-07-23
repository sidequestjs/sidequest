const { fork } = require('child_process');
const events = require('events');

const id = require('../id');

const daemonPath = `${__dirname}/daemon.js`;
/**
 * Worker is responsable to execute the `task.run` method especified
 * at task file in a child process
 */
function Worker(task) {
    const forkProcess = fork(daemonPath);
    const workerId = id.generate();
    const workerTask = task;
    
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
    
    /**
     * execute will request to the worker child process
     * to execute the task.run method
     */
    this.execute = () => {
        forkProcess.send({
            type: 'execute',
            data: workerTask
        });
    }
    
    /**
     * task return the executed task
     * @returns {object} task
     */
    this.task = () => {
        return workerTask;
    }

    /**
     * id returns the worker id
     * @returns {string} worker id
     */
    this.id = () => {
        return workerId;
    }
    
    /**
     * pid returns the child process pid
     * @returns {string} child process pid
     */
    this.pid = () => {
        return forkProcess.pid.toString();
    }
    
    /**
     * terminate sends a SIGTERM to chield process
     */
    this.terminate = () => {
        forkProcess.kill('SIGTERM');
    }
    
    /**
     * isDead returns true if the child process was terminated
     * @returns {boolean} 
     */
    this.isDead = () => {
        return forkProcess.killed;
    }

    /**
     * isAlive returns true if the child process is running
     * @returns {boolean}
     */
    this.isAlive = () => {
        return !this.isDead();
    }
}

Worker.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = Worker;