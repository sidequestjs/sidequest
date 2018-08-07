const cron = require('node-cron');

process.on('message', (message) => {
    if(message.type == 'taks-registration'){
        let task = message.task;
        let t = require(task.path);
        cron.schedule(task.cron, () => {
            process.send({
                type: 'started',
                task: task
            });
            t.run();
            process.send({
                type: 'done',
                task: task
            });
        });
        process.send({
            type: 'task-registred',
            task: task
        });
    }
});

// notificar quando não tem mais tasks, para ser finalizado