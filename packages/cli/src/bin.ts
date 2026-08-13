#!/usr/bin/env node
import { processIo } from "./io.js";
import { runCli } from "./run.js";

const code = await runCli(process.argv.slice(2), processIo);
process.exitCode = code;
