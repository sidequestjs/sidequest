const { Task } = require('../dist');

class MyJob extends Task {
  run(text, number){
    console.log(this.id)
    console.log(text, number);
  }
}

module.exports = MyJob;