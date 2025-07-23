const cron = require('node-cron');
const fs = require('fs');

module.exports = (() => {
    function failOnInvalidCron(task){
        // starts a stoped task, node-cron will fail with a 
        // wrong cron expression.
        let t = cron.schedule(task.cron, null, false);
        t.destroy();  
    }

    /**
     * validate a task, if task is invalid a exception will be thrown
     * @param {*} task 
     */
    function validate(task){
        failOnInvalidCron(task);

        if(!task.name || (typeof task.name !== 'string') || task.name.length  === 0 ){
            throw "Invalid task name!"
        }

        if(!fs.existsSync(task.path)){
            throw "Invalid task path!"
        }
    }

    return {
        validate: validate
    }
})();