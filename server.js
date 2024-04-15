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

async function getFileSize(filePath) {
    try {
        const stats = await fs.promises.stat(filePath);
        return stats.size;
    } catch (err) {
        console.log(err.message);
    }
}

async function getDirectoryContents(myPath, filesJson) {
    try {
        const files = await fs.promises.readdir(myPath, {withFileTypes: true});
        for (const file of files) {
            console.log(file);
            let fileDesc = {name: file.name, isFolder: file.isDirectory()};
            if (file.isFile()) {
                const size = await getFileSize(path.join(file.path, file.name));
                // Autre syntaxe : fileDesc = {...fileDesc, size: size};
                fileDesc = {...fileDesc, size};
            }
            filesJson.push(fileDesc);
        }
        return true
    } catch (err) {
        console.error(err);
        return false
    }
}

async function getFileContent(myPath, fileContent) {
    try {
        fileContent = await fs.promises.readFile(myPath, { encoding: 'utf8'});
        return true
    } catch (err) {
        return false
    }
}

app.get('/api/drive', async (req, res) => {
    console.log("Starting processing /api/drive")
    const filesJson = [];
    if (await getDirectoryContents(rootPath, filesJson)) {
        res.status(200).send(filesJson);
    } else {
        res.status(500);
    }

})

app.get('/api/drive/:name', async (req, res) => {
    console.log(req.params);
    console.log("XXX Starting processing /api/drive/" + req.params.name);
    const jsonOutput = [];
    const myPath = path.join(os.tmpdir(), "alpsdrive", req.params.name);
    const stats = await fs.promises.stat(myPath);
    if(stats.isDirectory()) {
        if (await getDirectoryContents(myPath, jsonOutput)) {
            res.status(200).send(jsonOutput);
        } else {
            res.status(500);
        }
    } else {
        // file : get file content
        const fileContent = '';
        if (await getFileContent(myPath, fileContent)) {
            res.status(200);
            res.sendFile(myPath, {headers: {'Content-Type' : 'application/octet-stream' }} );
        } else {
            res.status(500);
        }
    }

})

app.get('/api/drive/:folder/:name', async (req, res) => {
    console.log(req.params);
    console.log("Starting processing /api/drive/" + req.params.folder + "/" + req.params.name);
    const myPath = path.join(os.tmpdir(), "alpsdrive", req.params.folder, req.params.name);
    console.log(myPath);
    const stats = await fs.promises.stat(myPath);
    if(stats.isDirectory()) {
        if (await getDirectoryContents(myPath, jsonOutput)) {
            res.status(200).send(jsonOutput);
        } else {
            res.status(500);
        }
    } else {
        // file : get file content
        const fileContent = '';
        if (await getFileContent(myPath, fileContent)) {
            res.status(200);
            res.sendFile(myPath, {headers: {'Content-Type' : 'application/octet-stream' }} );
        } else {
            res.status(500);
        }
    }

})

export function start() {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`)
    })
}


