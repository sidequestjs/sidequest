const cron = require('node-cron');

function registerTask(task){
    cron.schedule(task.cron, () => {
        process.send({
            type: 'execution-request',
            data: task
        });
    });
    console.info(`[SCHEDULER DAEMON ${process.pid}]: Task ${task.name} registred`);
    process.send({
        type: 'registred',
        data: task
    });
};

process.on('message', (message) => {
    switch(message.type){
        case 'register':
            registerTask(message.data);
            break;
    }
});

process.on('uncaughtException', (error) => {
    process.send({
        type: 'fail',
        data: error
    });
})