const express = require('express')
const app = express()
const port = 3000


function start() {
    app.use(function (req, res, next) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader("Access-Control-Allow-Headers", "*");
        next();
    });

    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`)
        console.log(`Send request with curl localhost:${port}`)
    })

    app.get('/', (req, res) => {
        console.log("Got it ! ")
        res.send('My name is Bond. James Bond. ')
    })
}

exports.start = start;