const Worker = require('./worker');

module.exports = (() => {
    const workers = [];

    function worker(){
        if(workers.length <= 10){
            let w = new Worker();
            workers.push(w);
            return w;
        }
    }

    function register(task){
        let w = worker();
        w.register(task);
    }

    return {
        register: register
    }
})();