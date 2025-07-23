const path = require('path');
const Worker = require('./worker');
const Api = require('./api/http');


module.exports = (() => {
    const defaultMaxWorkers = 10;
    let sharedWorkers;
    let exclusiveWorkers;
    let config;

    /**
     * initialize the side-worker
     * 
     * An config file is option, if not passed side-worker will try to 
     * use the file ./side-worker-config.json
     * 
     * @param {string} configPath optional 
     */
    function initialize(configPath){
        config = loadConfigs(configPath);
        sharedWorkers = [];
        exclusiveWorkers = [];
        loadTasks(config);
    }

    function worker(type){
        if(type === 'exclusive'){
            let w = new Worker('exclusive');
            exclusiveWorkers.push(w);
            return w;
        }
        let maxWorkers = config.maxSharedWorkers || defaultMaxWorkers;
        if(sharedWorkers.length < maxWorkers){
            let w = new Worker('shared');
            sharedWorkers.push(w);
            return w;
        }
        let totalTask = sharedWorkers.reduce((total, worker) => { return total + worker.tasks().length }, 0);
        let currentWorker = totalTask %  maxWorkers;
        return sharedWorkers[currentWorker]; 
    }

    function loadConfigs(configPath){
        configPath = configPath || `${path.resolve('./')}/side-worker-config.json`;
        console.info(`Loading config ${configPath}...`);
        return require(configPath);
    }

    function loadTasks(config){
        config.tasks.forEach(task => {
            register(task);
        });
    }

    function register(task){
        let w = worker(task.workerType);
        w.register(task);
    }

    function getSharedWorkers(){
        return sharedWorkers.slice(0);
    }

    function getExclusiveWorkers(){
        return exclusiveWorkers.slice(0);
    }

    function terminate(){
        sharedWorkers.forEach((worker) => {
            worker.kill();
        });
        exclusiveWorkers.forEach((worker) => {
            worker.kill();
        });
    }

    return {
        initialize: initialize,
        sharedWorkers: getSharedWorkers,
        exclusiveWorkers: getExclusiveWorkers,    
        terminate: terminate
    }
})();