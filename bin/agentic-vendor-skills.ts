#!/usr/bin/env bun

import { main } from "../src/thirdparty-skills/cli";

process.exitCode = main(process.argv.slice(2));
