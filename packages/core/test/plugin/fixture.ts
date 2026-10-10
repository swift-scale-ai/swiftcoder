import { AgentV2 } from "@swiftscale/core/agent"
import { AISDK } from "@swiftscale/core/aisdk"
import { Catalog } from "@swiftscale/core/catalog"
import { CommandV2 } from "@swiftscale/core/command"
import { Credential } from "@swiftscale/core/credential"
import { AppNodeBuilder } from "@swiftscale/core/effect/app-node-builder"
import { LayerNodePlatform } from "@swiftscale/core/effect/app-node-platform"
import { LayerNode } from "@swiftscale/core/effect/layer-node"
import { EventV2 } from "@swiftscale/core/event"
import { FileSystem } from "@swiftscale/core/filesystem"
import { FSUtil } from "@swiftscale/core/fs-util"
import { Integration } from "@swiftscale/core/integration"
import { Location } from "@swiftscale/core/location"
import { Npm } from "@swiftscale/core/npm"
import { PluginV2 } from "@swiftscale/core/plugin"
import { Reference } from "@swiftscale/core/reference"
import { SkillV2 } from "@swiftscale/core/skill"
import { Effect, Layer } from "effect"
import { tempLocationLayer } from "../fixture/location"

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: () => Effect.succeed({ directory: "", entrypoint: undefined }),
    install: () => Effect.void,
    which: () => Effect.succeed(undefined),
  }),
)

export const PluginTestLayer = AppNodeBuilder.build(
  LayerNode.group([
    FileSystem.node,
    FSUtil.node,
    Location.node,
    Npm.node,
    Credential.node,
    EventV2.node,
    LayerNodePlatform.httpClient,
    PluginV2.node,
    AgentV2.node,
    AISDK.node,
    Catalog.node,
    CommandV2.node,
    Integration.node,
    Reference.node,
    SkillV2.node,
  ]),
  [
    [Location.node, tempLocationLayer],
    [Npm.node, npmLayer],
  ],
)
