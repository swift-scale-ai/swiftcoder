// @ts-nocheck

import { SwiftCoder } from "@opencode-ai/core"
import { ReadTool } from "@opencode-ai/core/tools"

const swiftcoder = SwiftCoder.make({})

swiftcoder.tool.add(ReadTool)

swiftcoder.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

swiftcoder.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

swiftcoder.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await swiftcoder.session.create({
  agent: "build",
})

swiftcoder.subscribe((event) => {
  console.log(event)
})

await swiftcoder.session.prompt({
  sessionID,
  text: "hey what is up",
})

await swiftcoder.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await swiftcoder.session.wait()

console.log(await swiftcoder.session.messages(sessionID))
