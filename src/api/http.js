const http = require('http');

function Api(config, masterWorker){
    const hostname = (config.adminServer && config.adminServer.host) || 'localhost';
    const port = (config.adminServer && config.adminServer.port) || 3000;

    function getSchedulers(schedulers){
        return schedulers.map((scheduler) => {
            return {
                id: scheduler.id(),
                pid: scheduler.pid(),
                tasks: scheduler.tasks()
            }
        });
    }

    function getWorker(workers){
        return workers.map((worker) => {
            return {
                id: worker.id(),
                pid: worker.pid()
            }
        });
    }

    const server = http.createServer((req, res) => {
        if(req.url == '/data'){
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end( JSON.stringify({ 
                startedAt: masterWorker.startedAt(),
                schedulers: getSchedulers(masterWorker.schedulers()),
                workers: getWorker(masterWorker.currentWorkers())
            }));
        }
    });
    
    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });

    this.terminate = () => {
        server.close();
        server.unref();
    }
}

module.exports = Api; 