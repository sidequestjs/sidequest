'use strict';

const { fork } = require('child_process');
const events = require('events');
const id = require('../id');

const daemonPath = `${__dirname}/daemon.js`;

/**
 * Scheduler is responsable to check in a isolated process 
 * if a task need to be performed
 */
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
            case 'fail':
                forkProcess.kill();
                this.emit('died', this);
                break;
        }
    });
    
    /**
     * register send a task to the daemon for scheduling
     * @param {*} task 
     */
    this.register = (task) => {
        task.id = id.generate();
        forkProcess.send({ type: 'register', data: task });
    };

    /**
     * id returns the scheduler id
     * @returns {string} scheduler id
     */
    this.id = () => {
        return schedulerId;
    };

    /**
     * pid returns the scheduler pid
     * @returns {string} scheduler pid
     */
    this.pid = () => {
        return forkProcess.pid.toString();
    };

    /**
     * terminate disconect the daemon from main proccess
     * the daemon will be notified and will kill itself
     */
    this.terminate = () => {
        forkProcess.kill();
    };
    
    /**
     * isDead returns true if the child process was terminated
     * @returns {boolean} 
     */
    this.isDead = () => {
        return forkProcess.killed;
    };

    /**
     * isAlive returns true if the child process is running
     * @returns {boolean}
     */
    this.isAlive = () => {
        return !this.isDead();
    };

    /**
     * tasks returns the scheduled tasks
     * @returns {array} scheduled tasks
     */
    this.tasks = () => {
        return tasks.slice(0);
    };
}

Scheduler.prototype = events.EventEmitter.prototype;
module.exports = Scheduler;