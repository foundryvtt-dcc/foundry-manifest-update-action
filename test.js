const download = require('download')
// const fs = require('fs')
const manifestFileName = "system.json"

const manifestURL = `https://github.com/foundryvtt-dcc/foundry-release-action-testbed/releases/download/v0.26.3/system.json`

// https.get(manifestURL, (response) => {
//   response.on('data', (data) => {
//     fs.writeFileSync(manifestFileName, data)
//   })
// })



// // Url of the image
// const file = 'GFG.jpeg';
// // Path at which image will get downloaded
// const filePath = `${__dirname}/files`;

download(manifestURL, './')
  .then(() => {
    console.log('Download Completed');
  })

