const cron = require('node-cron');

function registerTask(task){
    cron.schedule(task.cron, () => {
        process.send({
            type: 'execution-request',
            data: task
        });
    });
    console.info(`[SCHEDULER DAEMON ${process.pid}]: Task ${task.name} registred`);
};

process.on('message', (message) => {
    switch(message.type){
        case 'register':
            registerTask(message.data);
    }
});

process.on('disconnect', () => {
    console.log('Scheduler disconnected, exiting...');
    process.exit(0);
});