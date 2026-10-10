export * as PublicEventManifest from "./public-event-manifest"

import { Event } from "@swiftscale/schema/event"
import { EventManifest } from "@swiftscale/schema/event-manifest"

export const Definitions = EventManifest.ServerDefinitions
export const Latest = Event.latest(Definitions)
