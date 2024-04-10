
const express = require('express')
const server = express()
const port = 3000

function start() {
  server.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
    console.log(`Send request with curl localhost:${port}`)
  })

  server.get('/', (req, res) => {
    console.log("Got it !")
    res.send('My name is Bond. James Bond. ')
  })
}

exports.start = start;