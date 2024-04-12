import express from 'express'
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const app = express()
const port = 3000

const racinePath = path.join(os.tmpdir(), "drivetmp");

app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});

app.get('/api/drive', async (req, res) => {
    console.log("Starting processing /api/drive")
    try {
        const files = await fs.promises.readdir(racinePath);
        console.log(files);
        for (const file of files)  console.log(file);
        const filesJson = files.map( (file) => {
            let fileObj = {} ;
            fileObj.name = file;
            // fileObj.isFolder = file.isDirectory();
            return fileObj;
        })
        res.send(filesJson);

    } catch (err) {
        console.error(err);
    }

})

export function start() {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`)
    })
}


