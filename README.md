# sidequest

Sidequest is simple background processor for node.js

It's the first task scheduler that you may add to your web application project with safety, by using child process or running on backgroun it wont block the main process, even with if the task use blocking io.

## Usage

Tree steps to background tasks :rocket:

- 1. Install sidequest dependency

```sh
npm install --save sidequest
```

- 2. Create a task class

```js
const { Task } = require("sidequest");

class MyJob extends Task {
  run(foo, bar) {
    console.log(foo, bar);
  }
}

module.exports = MyJob;
```

- 3. Create the `sidequest-config.json` and register your queues and tasks:

```json
{
  "queues": [
    {
      "name": "high",
      "workers": 10
    },
    {
      "name": "default",
      "workers": 2
    }
  ],
  "tasks": [
    {
      "name": "MyJob",
      "path": "./playground/my-job.js",
      "queue": "high"
    }
  ]
}
```

- 4. Initialize `sidequest` in you app:

```js
const sidequest = require("sidequest");

// ...
sidequest.start();
// ...
```

- Alternative: Start sidequest by command line:

```bash
$ npm install -g sidequest
$ sidequest
```
