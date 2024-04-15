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

async function getDirectoryContents(myPath, res) {
    const filesJson = [];

    try {
        const files = await fs.promises.readdir(myPath, {withFileTypes: true});
        for (const file of files) {
            let fileDesc = {name: file.name, isFolder: file.isDirectory()};
            if (file.isFile()) {
                const size = await getFileSize(path.join(file.path, file.name));
                // Autre syntaxe : fileDesc = {...fileDesc, size: size};
                fileDesc = {...fileDesc, size};
            }
            filesJson.push(fileDesc);
        }
        res.status(200).send(filesJson);
        return true
    } catch (err) {
        res.status(500);
        console.error(err);
        return false
    }
}

async function getFileContent(myPath, fileContent) {
    try {
        await fs.promises.readFile(myPath, {encoding: 'utf8'});
        return true
    } catch (err) {
        return false
    }
}

async function getFileOrDir(res, myPath) {
    const jsonOutput = [];
    console.log("Entering getFileOrDirs");
    const stats = await fs.promises.stat(myPath);
    if (stats.isDirectory()) {
        console.log("-> directory !");
        await getDirectoryContents(myPath, res);
    } else {
        console.log("-> File !")
        res.status(200);
        res.sendFile(myPath, {headers: {'Content-Type': 'application/octet-stream'}});
    }
}

async function createDirectory(dirPath) {
    try {
        await fs.promises.mkdir(dirPath);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

function checkPath(dirPath) {
}


app.get('/api/drive/:name', async (req, res) => {
    console.log("Starting processing /api/drive/" + req.params.name);
    const myPath = path.join(os.tmpdir(), "alpsdrive", req.params.name);
    await getFileOrDir(res, myPath);
})

app.get('/api/drive/:folder/:name', async (req, res) => {
    console.log("Starting processing /api/drive/" + req.params.folder + "/" + req.params.name);
    const myPath = path.join(os.tmpdir(), "alpsdrive", req.params.folder, req.params.name);
    await getFileOrDir(res, myPath);
})

app.post('/api/drive', async (req, res) => {
    console.log("Starting processing 'create directory' with POST request : name=", req.query.name);
    const dirPath = path.join(os.tmpdir(), "alpsdrive", req.query.name);
    // Make sure name contains only allowed alphanumeric characters
    checkPath(dirPath);
    // Create directory
    await createDirectory(dirPath);
    // Display
    await getDirectoryContents(rootPath, res);
})

app.get('/api/drive', async (req, res) => {
    console.log("Starting processing /api/drive")
    await getDirectoryContents(rootPath, res);
})

export function start() {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`)
    })
}


