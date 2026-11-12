# Compendium pack workflow

Foundry v12 stores compendium packs as LevelDB directories: binary, per-machine,
and impossible to review in a diff. This module therefore keeps a readable JSON
copy of every pack under `src/packs/` and treats the LevelDB as build output.

```
src/packs/<pack>/*.json        tracked source of truth
        │   ▲
  pack  │   │  unpack
        ▼   │
packs/<pack>/                  compiled LevelDB — gitignored
        │
        ▼
module.json  →  Foundry loads the compendium
```

`packs/` is entirely untracked. A fresh clone has no compendium data until you
build it.

## Setup

```bash
npm install
npm run pack     # build every pack from src/packs/
```

The repo is symlinked into Foundry's module directory, so a build is visible in
Foundry after a reload.

## The two directions

**`npm run pack`** compiles `src/packs/<pack>/` into `packs/<pack>/`. Use it
after editing JSON by hand, and after a fresh clone.

Foundry holds the pack databases open while it runs, and writing to them
underneath it corrupts the LevelDB — so `pack` refuses to run while Foundry is
open. Quit Foundry first. (`FORCE_PACK=1` overrides this; only use it if you are
certain the packs are not loaded.)

**`npm run unpack`** extracts `packs/<pack>/` back into `src/packs/<pack>/`.
This is the direction that matters most day to day: most packs in this module
were authored by hand in Foundry, so Foundry is where edits happen and `unpack`
is how they get captured into git.

`unpack` reads the compendium but opens the database read-write, so LevelDB may
compact it — the files change even though the documents do not. It works with
Foundry open and has not caused problems, but reload the world afterwards, and
quit Foundry first if you want the pack files left strictly alone.

Either command takes optional pack names:

```bash
npm run pack   -- cyberpunk-armor cyberpunk-gear
npm run unpack -- cyberpunk-monsters
```

## Typical loop

1. Edit a compendium item in Foundry and test it in a world.
2. `npm run unpack` — the change appears as a reviewable JSON diff.
3. Commit.

## Filenames and ids

`unpack` names files `<Document_Name>_<id>.json` and the JSON carries `_id` and
`_key` fields that tie a document to its pack entry. Preserve them: changing an
`_id` makes Foundry treat the document as a new one, breaking any actor sheet,
macro, or compendium link that referenced the old id.

## Overwrite protection

`unpack` replaces the contents of a pack's source directory. If the compiled
pack holds fewer documents than `src/packs/` already has, the tool refuses
rather than silently discarding the difference:

```
REFUSED cyberpunk-npc-templates: compiled pack has 64 documents but
src/packs has 75. Unpacking would discard 11.
```

That means the two have diverged and you need to decide which side is correct.
Naming the pack explicitly (`npm run unpack -- <pack>`) overrides the refusal
and takes the compiled pack's version.

## Pack inventory notes

Every declared pack has content. `cyberpunk-backgrounds` (33) and
`cyberpunk-feats` (7) were empty for a while — their documents were lost in the
LevelDB migration and recovered from an old branch.

Racial features used to live here as `cyberpunk-npc-racial-features`. They were
never cyberpunk-specific and were never declared in `module.json`, so they moved
to the `seanma-custom-5e-foundry` module, which pairs them with the NPC builder
that applies them. The NPC templates stayed here: they are cyberpunk monsters
and stand on their own without a race applied.

## Releasing

A clone of this repo contains no compendium data, so a release has to be
*built* — it cannot be a zip of the git tree. `.github/workflows/release.yml`
does that, triggered by a version tag:

```bash
git tag v1.1.7
git push origin v1.1.7
```

The workflow installs dependencies, runs `npm run pack`, checks that every pack
with JSON sources actually produced LevelDB data, stamps the version into
`module.json`, zips the module with `packs/` included, and attaches `module.zip`
and `module.json` to a GitHub release.

The tag is the only source of truth for the version. It is stamped into the
`module.json` that ships in the zip, so there is no version to keep in sync by
hand and no automatic version bumping — a release happens when you tag one.

`module.json` points both `manifest` and `download` at
`releases/latest/download/`, so Foundry's update check reads the newest
release's manifest rather than whatever happens to be on `main`.

The verification step exists because of a real failure: before this workflow,
`download` pointed at `archive/refs/heads/main.zip`, a zip of the git tree.
Since `packs/` is gitignored, every install from that manifest URL produced a
module with 17 empty compendiums. Shipping that again should fail the build, not
reach users.
