/// <reference path="../markdown.d.ts" />

export * as SkillPlugin from "./skill"

import { define } from "./internal"
import { Effect } from "effect"
import { AbsolutePath } from "../schema"
import { SkillV2 } from "../skill"
import customizeSwiftCoderContent from "./skill/customize-swiftcoder.md" with { type: "text" }

export const CustomizeSwiftCoderContent = customizeSwiftCoderContent

export const Plugin = define({
  id: "skill",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.skill.transform((draft) => {
      draft.source(
        SkillV2.EmbeddedSource.make({
          type: "embedded",
          skill: SkillV2.Info.make({
            name: "customize-swiftcoder",
            description:
              "Use ONLY when the user is editing or creating swiftcoder's own configuration: swiftcoder.json, swiftcoder.jsonc, files under .swiftcoder/, or files under ~/.config/opencode/. Also use when creating or fixing swiftcoder agents, subagents, commands, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring swiftcoder itself.",
            location: AbsolutePath.make("/builtin/customize-swiftcoder.md"),
            content: CustomizeSwiftCoderContent,
          }),
        }),
      )
    })
  }),
})
