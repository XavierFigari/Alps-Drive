import express from 'express'
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const app = express()
const port = 3000

const rootPath = path.join(os.tmpdir(), "alpsdrive");

app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (err) {
        console.log(err.message);
    }
}
app.get('/api/drive', async (req, res) => {
    console.log("Starting processing /api/drive")
    try {
        const files = await fs.promises.readdir(rootPath, {withFileTypes: true});
        const filesJson = files.map( (file) => {
            let fileObj = {} ;
            fileObj.name = file.name;
            fileObj.isFolder = false;
            fileObj.isFolder = file.isDirectory();
            if (file.isFile()) fileObj.size = getFileSize(path.join(file.path, file.name));
            return fileObj;
        })
        res.send(filesJson);
        res.status(200);

    } catch (err) {
        res.status(500);
        console.error(err);
    }

})

export function start() {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`)
    })
}


