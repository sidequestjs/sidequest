const path = require('path');
const cluster = require('cluster');

const scheduler = require('./conductor');

module.exports = (() => {    
    function initialize(configPath){
        config = loadConfigs(configPath);
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
        scheduler.register(task);
    }
    
    return {
        initialize: initialize
    }
})();