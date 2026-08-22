# Third-Party Notices

SwiftCoder is a controlled fork that includes upstream source code, generated
metadata, fonts, icons, media, and package dependencies maintained by third
parties. This file records the notices that must remain with source and binary
distributions.

## SwiftCore

SwiftCoder redistributes shared runtime, protocol, UI, and agent components
from the SwiftCore repository. SwiftCore is licensed under the MIT License. A
copy of its license is included at `legal/SwiftCore-LICENSE.txt`.

## OpenCode

SwiftCoder contains substantial portions of OpenCode copied from commit
`284214c78d32a09fd9c729bdefc07be50f74eb40` and modified by SwiftScale.

Copyright (c) 2025 opencode

OpenCode is licensed under the MIT License. The complete upstream license is
included at `legal/OpenCode-LICENSE.txt`. The original project is available at
<https://github.com/anomalyco/opencode>.

## models.dev

The model catalog snapshots in `packages/opencode/resources/models-api.json`
and `packages/opencode/test/tool/fixtures/models-api.json` are generated from
models.dev data.

Copyright (c) 2025 models.dev

models.dev is licensed under the MIT License. The complete license is included
at `legal/models.dev-LICENSE.txt`. The source project is available at
<https://github.com/sst/models.dev>.

## Fonts

SwiftCoder distributes Plus Jakarta Sans, Inter, and a patched JetBrains Mono
Nerd Font supplied by SwiftCore's shared UI package. These font files remain
under the SIL Open Font License 1.1 and are not relicensed under SwiftCoder's
MIT License. Copyright notices and the complete OFL text are in
`legal/FONT-LICENSES.md`.

## Upstream Media And Test Assets

The help video, file-type icon set, test images, and other media inherited from
the recorded OpenCode baseline are distributed under the upstream OpenCode MIT
License unless a file carries a more specific notice. SwiftCoder brand artwork
is covered by `TRADEMARKS.md`.

## Package Dependencies

`THIRD_PARTY_DEPENDENCIES.md` is the generated inventory of installed package
versions and their declared licenses. Regenerate it after dependency changes:

```bash
node tools/generate-third-party-inventory.mjs
```

Package-specific license and notice files supplied by dependencies remain
authoritative. Release builds include this notice, the generated inventory,
the project license, and the files under `legal/`.

An inventory entry marked `NOASSERTION` is not authorized for inclusion in a
binary release without a separate license review. The current `buffers` entry
is a development-only transitive dependency and is not packaged with the
SwiftCoder desktop application.
