const path = require('path');
const cluster = require('cluster');

const MasterWorker = require('./master-worker');
const Api = require('./api/http')

module.exports = (() => {    
    let masterWorker;
    let api;

    function initialize(){
        config = loadConfigs();
        masterWorker = new MasterWorker(config);
        loadTasks(config);
        api = new Api(config, masterWorker);
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
        api.terminate();
        masterWorker.terminate();
    }
    
    return {
        initialize: initialize,
        masterWorker: getMasterWorker,
        terminate: terminate
    }
})();