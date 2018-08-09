const path = require('path');
const cluster = require('cluster');

const MasterWorker = require('./master-worker');

module.exports = (() => {    
    let masterWorker;

    function initialize(configPath){
        config = loadConfigs(configPath);
        masterWorker = new MasterWorker(config);
        loadTasks(config);
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
    
    function register (task){
        masterWorker.register(task);
    }
    
    return {
        initialize: initialize
    }
})();