# Asset Scattering

[![NodeJS with Webpack](https://github.com/BarthPaleologue/babylonjs-template/actions/workflows/webpack.yml/badge.svg)](https://github.com/BarthPaleologue/babylonjs-template/actions/workflows/webpack.yml)
[![Build & Deploy site to Pages](https://github.com/BarthPaleologue/AssetScattering/actions/workflows/deploy.yml/badge.svg)](https://github.com/BarthPaleologue/AssetScattering/actions/workflows/deploy.yml)

![Screenshot](./cover.png)

A procedural asset scattering system built with BabylonJS. It can render millions of blades of grass with LoD and cute butterflies.

## Online demo

Main demo with procedural terrain, lod, collisions, butterflies: [here](https://barthpaleologue.github.io/AssetScattering/)

Large flat grass field with lod and butterflied: [here](https://barthpaleologue.github.io/AssetScattering/field.html)

Minimal example of a dense patch of grass: [here](https://barthpaleologue.github.io/AssetScattering/minimal.html)

## How to use

The files for the asset scattering are located in the folder `src/ts/instancing`.

There are 2 types of patches: `InstancePatch` and `ThinInstancePatch`. They both use the same interface `IPatch` so they are interchangeable.

### Which one to use?

If you want raw speed, prefer `ThinInstancePatch`. It is faster because it uses a single draw call for all the instances. However, you give up the ability to have collisions on your instances.

On the other hand, `InstancePatch` is slower, but you get a list of `InstancedMesh` that you can tweak individually. This is useful if you want to have collisions on your instances.

### Manage LoD

You can have LoD with your patches by using a `PatchManager`. Simply add your patches to the manager, and the different LoD levels of your base mesh and the manager will take care of the rest as long as you call its `update` method.

### Collisions

To enable collisions on an `InstancePatch`, simply set `checkCollisions=true` on your base mesh. Then moving objects with `moveWithCollisions` will respect the collisions.

## Resources

The grass rendering is based on [this video]() from Simon Dev. It is itself based on [this gdc conference]().

The wind sound effect is from [this video](https://www.youtube.com/watch?v=a3aFMAalCpk).

## Run locally

```bash
npm install
npm run serve
```
