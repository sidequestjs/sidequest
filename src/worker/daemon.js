function executeTask(task){
    console.info(`[WORKER DAEMON ${process.pid}]: Task ${task.name} execution`);
    let t = require(task.path);
    process.send({
        type: 'execution-started',
        data: task
    });
    t.run();
    process.send({
        type: 'execution-done',
        data: task
    });
};

process.on('message', (message) => {
    switch(message.type){
        case 'execute':
            executeTask(message.data);
    }
});

process.on('disconnect', () => {
    console.log('Worker disconnected, exiting...');
    process.exit(0);
});