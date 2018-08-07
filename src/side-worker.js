const path = require('path');
const Worker = require('./worker');


module.exports = (() => {
    const defaultMaxWorkers = 10;
    let workers;
    let config;

    function initialize(configPath){
        config = loadConfigs(configPath);
        workers = [];
        loadTasks(config);
    }

    function worker(){
        let maxWorkers = config.maxWorkers || defaultMaxWorkers;
        if(workers.length < maxWorkers){
            let w = new Worker();
            workers.push(w);
            return w;
        }
        let totalTask = workers.reduce((total, worker) => { return total + worker.tasks().length }, 0);
        let currentWorker = totalTask %  maxWorkers;
        return workers[currentWorker]; 
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
        let w = worker();
        w.register(task);
    }

    function getWorkers(){
        return workers.slice(0);
    }

    function terminate(){
        workers.forEach((worker) => {
            worker.kill();
        });
    }

    return {
        initialize: initialize,
        workers: getWorkers,    
        terminate: terminate
    }
})();