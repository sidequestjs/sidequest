
const daemon = require('../dist/daemon');
const MyJob = require('../test/my-job');

daemon.start();

async function run(){
  const date = new Date();
  date.setSeconds(date.getSeconds() + 10);

  for(let i = 0; i < 2; i++){
    await MyJob.enqueue({ performAt: date }, `message ${i}`, i);
  }
}

run();