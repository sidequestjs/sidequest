process.on('message', (message) => {
    let task = message.task;
    let t = require(task.path);
    if(message.type = 'taks-registration'){
        process.send({
            type: 'task-registred',
            task: task
        });
    }
    t.run();
});

// notificar quando não tem mais tasks, para ser finalizado