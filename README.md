# GitHub Action to Update Manifest in `main` After a Release is Published

This GitHub Action enables you to release a Foundry VTT System or Module by simply updating the 'version.txt' file in your main branch.

This is to be used with the `foundry-release-action`, and runs after a release is published to copy the manifest into main with the latest version information.

## Install Instructions

Create a folder named `.github` at the root of your workflow, and inside that folder, create a `workflows` folder.

In the `workflows` folder, create a file named `foundry_manifest_update.yml` with this content:

```
name: Foundry Manifest Update

on:
    release:
        types:
          - published

jobs:
  update_manifest_post_release:
    runs-on: ubuntu-latest
    name: Foundry Manifest Update
    steps:
      - name: Foundry Manifest Update
        id: foundry-manifest Update
        uses: foundryvtt-dcc/foundry-manifest-update-action@main
        with:
          actionToken: ${{ secrets.GITHUB_TOKEN }}
          manifestFileName: 'system.json'
```

For `manifestFileName` you will either enter `system.json` or `module.json` depending on your project.

You should not need to change `actionToken` from the example above.
