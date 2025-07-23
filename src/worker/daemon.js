const cron = require('node-cron');

function send(message){
    if(process.channel){
        process.send(message);
    } else {
        process.exit(0);
    }
}

process.on('message', (message) => {
    if(message.type == 'taks-registration'){
        let task = message.task;
        let t = require(task.path);
        cron.schedule(task.cron, () => {
            send({
                type: 'started',
                task: task
            });
            t.run();
            send({
                type: 'done',
                task: task
            });
        });
        send({
            type: 'task-registred',
            task: task
        });
    }
});

// notificar quando não tem mais tasks, para ser finalizado