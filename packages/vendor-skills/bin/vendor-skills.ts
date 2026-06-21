#!/usr/bin/env bun

import { main } from "../src/cli";

process.exitCode = main(process.argv.slice(2));
