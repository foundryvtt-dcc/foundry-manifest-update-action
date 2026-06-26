// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall

import * as core from '@actions/core'
import fs from 'fs'
import * as github from '@actions/github'
import shell from 'shelljs'

const manifestFileName = core.getInput('manifestFileName')
const manifestProtectedTrue = core.getInput('manifestProtectedTrue')
const actionToken = core.getInput('actionToken')
const octokit = github.getOctokit(actionToken)
const owner = github.context.payload.repository.owner.login
const repo = github.context.payload.repository.name
const committerEmail = github.context?.payload?.release?.author?.login || github.context?.payload?.head_commit?.author?.email
const committerUsername = committerEmail

async function updateManifest () {
  try {
    // Download updated manifest file
    const latestRelease = await octokit.rest.repos.getLatestRelease({
      owner,
      repo
    })
    console.log(latestRelease.data.assets)

    // Get the Asset ID of the manifest from the release info
    let assetID = 0
    for (const item of latestRelease.data.assets) {
      if (item.name === manifestFileName) {
        assetID = item.id
      }
    }
    if (assetID === 0) {
      console.log(latestRelease)
      core.setFailed('No AssetID for manifest')
      return
    }

    const manifestURL = `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetID}`
    console.log(manifestURL)

    // Download to a temp file first and verify it before overwriting the live
    // manifest. curl writes whatever it receives to --output, so a non-200
    // response (e.g. a GitHub "404 Not Found" JSON body) would otherwise clobber
    // module.json/latest.json with garbage and get committed back to main.
    const downloadTmp = `${manifestFileName}.download`
    const httpCode = shell.exec(
      'curl --silent --show-error --location --write-out \'%{http_code}\' ' +
      `--output ${downloadTmp} ` +
      `--header 'Authorization: token ${actionToken}' ` +
      '--header \'Accept: application/octet-stream\' ' +
      `${manifestURL}`
    ).stdout.trim()

    if (httpCode !== '200') {
      core.setFailed(`Failed to download manifest asset (HTTP ${httpCode}); leaving ${manifestFileName} untouched`)
      return
    }

    // Verify the downloaded asset is actually a parseable manifest before we
    // promote it over the committed copy.
    const downloaded = fs.readFileSync(downloadTmp, 'utf8')
    try {
      JSON.parse(downloaded)
    } catch (err) {
      core.setFailed(`Downloaded manifest asset is not valid JSON: ${err.message}`)
      return
    }
    fs.writeFileSync(manifestFileName, downloaded, 'utf8')
    fs.unlinkSync(downloadTmp)
    console.log('Past Download')

    // Replace Data in Manifest
    const manifestProtectedValue = manifestProtectedTrue === 'true' ? 'true' : 'false'
    const data = fs.readFileSync(manifestFileName, 'utf8')
    const formatted = data
      .replace(/"protected"\s*:\s*(true|false)/i, `"protected": ${manifestProtectedValue}`)
    fs.writeFileSync(manifestFileName, formatted, 'utf8')

    // Create/update latest.json as a clone of the updated manifest
    fs.writeFileSync('latest.json', formatted, 'utf8')
    console.log('Created/updated latest.json')

    // Keep package.json's version in sync with the released manifest. package.json
    // is not shipped to Foundry, but syncing here (the action that commits to main)
    // stops the npm metadata version from drifting away from the module version.
    try {
      const manifestVersion = JSON.parse(formatted).version
      if (manifestVersion && fs.existsSync('package.json')) {
        const pkg = fs.readFileSync('package.json', 'utf8')
        const bumped = pkg.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${manifestVersion}"`)
        if (bumped !== pkg) {
          fs.writeFileSync('package.json', bumped, 'utf8')
          await shell.exec('git add package.json')
          console.log(`Synced package.json version to ${manifestVersion}`)
        }
      }
    } catch (err) {
      console.log(`Could not sync package.json version: ${err.message}`)
    }

    // Commit and push updated manifest
    await shell.exec(`git config user.email "${committerEmail}"`)
    await shell.exec(`git config user.name "${committerUsername}"`)
    await shell.exec('git add latest.json')

    // Skip the commit/push entirely when nothing changed. `git commit` exits
    // non-zero on an empty tree, so re-running a release (or releasing a manifest
    // identical to what is already on main) would otherwise error out.
    const pending = shell.exec('git status --porcelain', { silent: true }).stdout.trim()
    if (!pending) {
      console.log('Manifest already up to date on main; nothing to commit.')
      return
    }

    await shell.exec(`git commit -am "Release ${latestRelease.data.tag_name}"`)
    await shell.exec('git push origin main')
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function run () {
  try {
    // Validate manifestFileName
    if (manifestFileName !== 'system.json' && manifestFileName !== 'module.json') { core.setFailed('manifestFileName must be system.json or module.json') }

    await updateManifest()
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
