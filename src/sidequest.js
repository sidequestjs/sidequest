
const daemon = require('../dist/daemon');
const MyJob = require('../test/my-job');

daemon.start();

async function run(){
  for(let i = 0; i < 100; i++){
    await MyJob.enqueue(`message ${i}`, i);
  }
}

// run();