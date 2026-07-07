#!/usr/bin/env pnpm -s tsx

import { object, option, string, type InferValue } from "@optique/core";
import { run } from "@optique/run";
import packageConfig from "@/package.json";

type CliArgs = InferValue<typeof cliArgsParser>;
const cliArgsParser = object({
  name: option("--name", string()),
});

async function main(args: CliArgs) {
  console.log(`Greetings, ${args.name}!`);
}

await main(
  run(cliArgsParser, {
    help: "both",
    completion: "both",
    version: packageConfig.version,
    author: [{ type: "text", text: packageConfig.name }],
  })
);
