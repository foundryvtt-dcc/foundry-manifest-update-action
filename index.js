// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall

const core = require('@actions/core')
const fs = require('fs')
const github = require('@actions/github')
const shell = require('shelljs')

const manifestFileName = core.getInput('manifestFileName')
const manifestProtectedTrue = core.getInput('manifestProtectedTrue')
const actionToken = core.getInput('actionToken')
const octokit = github.getOctokit(actionToken)
const owner = github.context.payload.repository.owner.login
const repo = github.context.payload.repository.name
const committer_email = github.context?.payload?.release?.author?.login || github.context?.payload?.head_commit?.author?.email
const committer_username = committer_email

async function updateManifest () {
  try {

    // Download updated manifest file
    const latestRelease = await octokit.rest.repos.getLatestRelease({
      owner: owner,
      repo: repo,
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
    }

    const manifestURL = `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetID}`
    console.log(manifestURL)
    await shell.exec(`curl --header 'Authorization: token ${actionToken}' --header 'Accept: application/octet-stream' --output ${manifestFileName} --location ${manifestURL}`)
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

    // Commit and push updated manifest
    await shell.exec(`git config user.email "${committer_email}"`)
    await shell.exec(`git config user.name "${committer_username}"`)
    await shell.exec(`git add latest.json`)
    await shell.exec(`git commit -am "Release ${latestRelease.data.tag_name}"`)
    await shell.exec(`git push origin main`)

  } catch (error) {
    core.setFailed(error.message)
  }
}

async function run () {
  try {
    // Validate manifestFileName
    if (manifestFileName !== 'system.json' && manifestFileName !== 'module.json')
      core.setFailed('manifestFileName must be system.json or module.json')

    await updateManifest()

  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
