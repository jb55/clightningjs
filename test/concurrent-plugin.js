#!/usr/bin/env node
// A plugin whose one method answers after a delay, so calls overlap.
const Plugin = require(process.env.CLIGHTNINGJS || '../src/plugin.js');

const plugin = new Plugin();
plugin.addMethod('echo', async (params) => {
  await new Promise((resolve) => setTimeout(resolve, params[1]));
  return params[0];
}, '<value> <delay ms>', 'answer with value after delay');
plugin.start();
