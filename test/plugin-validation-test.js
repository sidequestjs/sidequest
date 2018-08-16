'use strict';

const { assert } = require('chai');
const pluginValidation = require('../src/plugin-validation');

describe('plugin validation', () => {
    it('should fail without initialize function', () => {
        assert.throw(() => {
            let plugin = { 
                terminate: (_) => {}
             }
            pluginValidation.validate(plugin);
        }, "a pluging must have a function initialize receiving one argument!");
    });

    it('should fail with initialize function without arguments', () => {
        assert.throw(() => {
            let plugin = { 
                initialize: () => {},
                terminate: (_) => {}
             }
            pluginValidation.validate(plugin);
        }, "a pluging must have a function initialize receiving one argument!");
    });

    it('should fail with initialize function with tow or more arguments', () => {
        assert.throw(() => {
            let plugin = { 
                initialize: (_a, _b) => {},
                terminate: (_) => {}
             }
            pluginValidation.validate(plugin);
        }, "a pluging must have a function initialize receiving one argument!");
    });

    it('should fail without terminate function', () => {
        assert.throw(() => {
            let plugin = { 
                initialize: (_) => {}
             }
            pluginValidation.validate(plugin);
        }, "a pluging must have a function terminate receiving one argument!");
    });

    it('should fail with terminate function without arguments', () => {
        assert.throw(() => {
            let plugin = { 
                initialize: (_) => {},
                terminate: () => {}
             }
            pluginValidation.validate(plugin);
        }, "a pluging must have a function terminate receiving one argument!");
    });

    it('should fail with terminatefunction with tow or more arguments', () => {
        assert.throw(() => {
            let plugin = { 
                initialize: (_) => {},
                terminate: (_a, _b) => {}
             }
            pluginValidation.validate(plugin);
        }, "a pluging must have a function terminate receiving one argument!");
    });
});