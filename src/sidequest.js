'use strict';

const path = require('path');

const MasterWorker = require('./master-worker');
const pluginValidation = require('./plugin-validation');

module.exports = (() => {    
    let masterWorker;
    let plugins = [];

    function loadConfigs(){
        let configPath = `${path.resolve('./')}/sidequest-config.json`;
        console.info(`Loading config ${configPath}...`);
        return require(configPath);
    }
    
    function register(task){
        masterWorker.register(task);
    }

    function loadTasks(config){
        config.tasks.forEach(task => {
            register(task);
        });
    }

    function use(plugin){
        pluginValidation.validate(plugin);
        plugins.push(plugin);
    }
    
    function getMasterWorker(){
        return masterWorker;
    }

    function terminate() {
        masterWorker.terminate();
        plugins.forEach((plugin) => {
            plugin.terminate();
        });
        plugins = [];
    }

    function initialize(){
        let config = loadConfigs();
        masterWorker = new MasterWorker(config);
        plugins.forEach((plugin) => {
            plugin.initialize(masterWorker);
        });
        loadTasks(config);
    }
    
    return {
        initialize: initialize,
        masterWorker: getMasterWorker,
        terminate: terminate,
        use: use
    };
})();