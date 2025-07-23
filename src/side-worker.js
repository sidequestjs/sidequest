const path = require('path');
const cluster = require('cluster');

const MasterWorker = require('./master-worker');

module.exports = (() => {    
    let masterWorker;

    function initialize(){
        config = loadConfigs();
        masterWorker = new MasterWorker(config);
        loadTasks(config);
    }
    
    function loadConfigs(){
        let configPath = `${path.resolve('./')}/sidequest-config.json`;
        console.info(`Loading config ${configPath}...`);
        return require(configPath);
    }
    
    function loadTasks(config){
        config.tasks.forEach(task => {
            register(task);
        });
    }
    
    function register(task){
        masterWorker.register(task);
    }

    function getMasterWorker(){
        return masterWorker;
    }

    function terminate() {
        masterWorker.terminate();
    }
    
    return {
        initialize: initialize,
        masterWorker: getMasterWorker,
        terminate: terminate
    }
})();