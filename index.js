// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall

const core = require('@actions/core')
const fs = require('fs')
const github = require('@actions/github')
const https = require('https')
const shell = require('shelljs')

const manifestFileName = core.getInput('manifestFileName')
const actionToken = core.getInput('actionToken')
const octokit = github.getOctokit(actionToken)
const owner = github.context.payload.repository.owner.login
const repo = github.context.payload.repository.name
const committer_email = github.context.payload.release.author.login
const committer_username = committer_email

async function updateManifest () {
  try {
    const latestRelease = await octokit.rest.repos.getLatestRelease({
      owner: owner,
      repo: repo,
    })
    const manifestURL = `https://github.com/${owner}/${repo}/releases/download/${latestRelease.data.tag_name}/system.json`

    // const file = fs.createWriteStream(manifestFileName)
    // await https.get(manifestURL, function(response) {
    //   response.pipe(file)
    // });

    https.get(manifestURL, (response) => {
      console.log('statusCode:', response.statusCode)
      console.log('headers:', response.headers)

      response.on('data', (data) => {
        fs.writeFileSync(manifestFileName, data)
      })
    })

    await shell.exec(`cat ${manifestFileName}`)
    await shell.exec(`git config user.email "${committer_email}"`)
    await shell.exec(`git config user.name "${committer_username}"`)
    await shell.exec(`git pull origin main`)
    //await shell.exec(`git commit -am "Release ${latestRelease.data.tag_name}"`)
    //await shell.exec(`git push origin HEAD:main`)

  } catch (error) {
    core.setFailed(error.message)
  }
}

async function run () {
  try {
    // Validate manifestFileName
    if (manifestFileName !== 'system.json' && manifestFileName !== 'module.json')
      core.setFailed('manifestFileName must be system.json or module.json')

    // const payload = JSON.stringify(github.context.payload, undefined, 2)
    // console.log(`The event payload: ${payload}`)
    await updateManifest()

  } catch (error) {
    core.setFailed(error.message)
  }
}

run()