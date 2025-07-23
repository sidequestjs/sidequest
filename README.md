# sidequest

Sidequest is a multi-process task scheduler for node.js.

It's the first task scheduler that you may add to your web application project with safety, becasue using multi-procss it'll not block the main process, even with if the task use blocking io. 


## Usage

Four steps to multi-process tasks :rocket:

- 1. Install sidequest dependency
```sh
npm install --save sidequest
```

- 2. Create a task file
```js
exports.task = () => {
    console.log('Hello!');
}
```

- 3. Create the `sidequest-config.json` and register your tasks:
```json
{
    "tasks": [
        {
            "name": "Hello task every 2 seconds",
            "path": "./path/to/hello.js",
            "cron": "*/2 * * * * *"
        },
        {
            "name": "Hello task every 5 seconds",
            "path": "./path/to/hello.js",
            "cron": "*/5 * * * * *"
        },
    ]
}
```

- 4. Initialize `sidequest` in you app:

```js
    const sidequest = require('sidequest');
    
    // ...
    sidequest.initialize();
    // ...
```
