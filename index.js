// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall

const core = require('@actions/core')
const github = require('@actions/github')
//const shell = require('shelljs')
//const fs = require('fs')

const manifestFileName = core.getInput('manifestFileName')
const actionToken = core.getInput('actionToken')
const octokit = github.getOctokit(actionToken)
const owner = github.context.payload.repository.owner.login
const repo = github.context.payload.repository.name
//const committer_email = github.context.payload.head_commit.committer.email
//const committer_username = github.context.payload.head_commit.committer.username

async function updateManifest () {
  try {
    const latestRelease = await octokit.rest.repos.getLatestRelease({
      owner: owner,
      repo: repo,
    })

    console.log(latestRelease)
    console.log(latestRelease.data.tag_name)
    console.log(`https://github.com/foundryvtt-dcc/dcc/releases/download/${latestRelease.data.tag_name}/system.json`)

  } catch (error) {
    core.setFailed(error.message)
  }
}

async function run () {
  try {
    // Validate manifestFileName
    if (manifestFileName !== 'system.json' && manifestFileName !== 'module.json')
      core.setFailed('manifestFileName must be system.json or module.json')

    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`)
    await updateManifest()

  } catch (error) {
    core.setFailed(error.message)
  }
}

run()