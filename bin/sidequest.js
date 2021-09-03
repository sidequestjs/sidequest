#!/usr/bin/env node

console.log('Starting Sidequest Daemon...');
const daemon = require('../dist/daemon');
daemon.start();