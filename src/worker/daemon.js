'use strict';

function sendResult(task, result){
    process.send({
        type: 'execution-done',
        data: task, 
        result: result
    });
}

function sendError(task, error){
    process.send({
        type: 'execution-error',
        data: task, 
        error: error
    });
}

function executeTask(task){
    console.info(`[WORKER DAEMON ${process.pid}]: Task ${task.name} execution`);
    let t = require(task.path);
    process.send({
        type: 'execution-started',
        data: task
    });
    try {
        let execution = t.run();
        if( execution instanceof Promise ){
            execution.then((result) => {
                sendResult(task, result);
            }).catch((error) => {
                sendError(task, error);
            });
        } else {
            sendResult(task, execution);
        }
    } catch (error) {
        sendError(task, error);
    }   
}

process.on('message', (message) => {
    switch(message.type){
        case 'execute':
        executeTask(message.data);
    }
});