'use strict';

const { assert } = require('chai');
const taskValidation = require('../src/task-validation');

describe('task validation', () => {
    it('should fail without name', () => {
        let task = { 
            'path': './test/test_assets/dummy_task.js',
            'cron': '* * * * *'
        };
        assert.throws(() => {
            taskValidation.validate(task);
        }, 'Invalid task name!');
    });

    it('should fail with empty name', () => {
        let task = { 
            'name': '',
            'path': './test/test_assets/dummy_task.js',
            'cron': '* * * * *'
        };
        assert.throws(() => {
            taskValidation.validate(task);
        }, 'Invalid task name!');
    });

    it('should not fail with a valid name', () => {
        let task = { 
            'name': 'Some Name',
            'path': './test/test_assets/dummy_task.js',
            'cron': '* * * * *'
        };
        assert.doesNotThrow(() => {
            taskValidation.validate(task);
        }, 'Invalid task name!');
    });

    it('should fail if file do not exists', () => {
        let task = { 
            'name': 'Some name',
            'path': './test/test_assets/invalid_path.js',
            'cron': '* * * * *'
        };
        assert.throws(() => {
            taskValidation.validate(task);
        }, 'Invalid task path!');
    });

    it('should not fail with a valid path', () => {
        let task = { 
            'name': 'Some Name',
            'path': './test/test_assets/dummy_task.js',
            'cron': '* * * * *'
        };
        assert.doesNotThrow(() => {
            taskValidation.validate(task);
        }, 'Invalid task path!');
    });

    it('should fail with invalid cron', () => {
        let task = { 
            'name': 'Some Name',
            'path': './test/test_assets/dummy_task.js',
            'cron': '* * X * *'
        };
        assert.throws(() => {
            taskValidation.validate(task);
        }, 'X is a invalid expression for day of month');
    });

    it('should not fail with a valid cron', () => {
        let task = { 
            'name': 'Some Name',
            'path': './test/test_assets/dummy_task.js',
            'cron': '* * * * *'
        };
        assert.doesNotThrow(() => {
            taskValidation.validate(task);
        }, 'X is a invalid expression for day of month');
    });
});