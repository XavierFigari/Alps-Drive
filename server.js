import express from 'express';
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import bb from 'express-busboy';

const app = express()
const port = 3000

const rootPath = path.join(os.tmpdir(), "alpsdrive");
const tmpPath = path.join(os.tmpdir(), "alpsdrive/tmp");

app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});

bb.extend(app, {
    upload: true,
    path: tmpPath,
    allowedPath: /./
});

// ======================= FUNCTIONS =======================

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

async function getFileOrDir(res, filename) {
    const jsonOutput = [];
    console.log("Entering getFileOrDirs");

    // Check if the file exists in the current directory.
    try {
        await fs.promises.access(filename);
        // The check succeeded
    } catch (err) {
        // The check failed
        console.log("Nom d'un chien ! Ce fichier ou dossier n'existe pas !", filename);
        return res.status(404).send("<h1>Nom d'un chien de 404 ! Ce fichier ou dossier n'existe pas !</h1> <h3>" + filename + "</h3>");
    }

    const stats = await fs.promises.stat(filename);
    if (stats.isDirectory()) {
        console.log("-> directory !");
        await getDirectoryContents(filename, res);
    } else {
        console.log("-> File !")
        res.status(200).sendFile(filename, {headers: {'Content-Type': 'application/octet-stream'}});
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

async function deleteFileOrDir(name) {
    return await fs.promises.rm(name, {recursive: true});
}

function checkFileName(name) {
    const regExp = /^[a-zA-Z]+$/;
    return regExp.test(name);
}

// ======================= API REQUESTS =======================

// Retourne une liste contenant les dossiers et fichiers à la racine du “drive”
app.get('/api/drive', async (req, res) => {
    console.log("Starting processing /api/drive")
    await getDirectoryContents(rootPath, res);
})

// Retourne le contenu de {name} : GET /api/drive/{name}
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

// Créer un dossier avec le nom {name} : POST /api/drive?name={name}
app.post('/api/drive', async (req, res) => {
    console.log("Starting processing 'create directory' with POST request : name=", req.query.name);
    const dirPath = path.join(os.tmpdir(), "alpsdrive", req.query.name);
    // Make sure name contains only allowed alphanumeric characters
    if (checkFileName(req.query.name)) {
        // Create directory
        await createDirectory(dirPath);
        // Display
        await getDirectoryContents(rootPath, res);
    }
})

// Créer un dossier avec le nom {name} dans {folder} : POST /api/drive{folder}?name={name}
app.post('/api/drive/:folder/', async (req, res) => {
    console.log("Starting processing 'create directory inside folder' with POST request :");
    console.log("Containing folder =", req.params.folder, "- New folder =", req.query.name);
    const dirPath = path.join(os.tmpdir(), "alpsdrive", req.params.folder, req.query.name);
    console.log("Path to create = ", dirPath)
    // Make sure name contains only allowed alphanumeric characters
    if (checkFileName(req.query.name)) {
        // Create directory
        await createDirectory(dirPath);
        // Display
        await getDirectoryContents(rootPath, res);
    }
})

// Suppression d’un dossier ou d’un fichier avec le nom {name} : DELETE /api/drive/{name}
app.delete('/api/drive/:name', async (req, res) => {
    console.log("Starting processing 'delete' with DELETE request : name=", req.params.name);
    const dirPath = path.join(os.tmpdir(), "alpsdrive", req.params.name);
    await deleteFileOrDir(dirPath);
    // Display again
    await getDirectoryContents(rootPath, res);
})

// Suppression d’un dossier ou d’un fichier avec le nom {name} dans {folder} : DELETE /api/drive/{folder}/{name}
app.delete('/api/drive/:folder/:name', async (req, res) => {
    console.log("Starting processing 'delete inside folder' with DELETE request : folder=", req.params.folder, " name=", req.params.name);
    const dirPath = path.join(os.tmpdir(), "alpsdrive", req.params.folder, req.params.name);
    console.log("File or folder to delete =", dirPath);
    await deleteFileOrDir(dirPath);
    // Display again
    await getDirectoryContents(rootPath, res);
})

// Créer un fichier à la racine du “drive : PUT /api/drive
app.put('/api/drive', async (req, res) => {
    // magically upload file thanks to busboy.
    console.log("Uploading file...");
    // move file to the correct location : racine du drive
    await fs.promises.rename(req.files.file.file, path.join(os.tmpdir(), "alpsdrive", req.files.file.filename));
    await getDirectoryContents(rootPath, res);
    // cleanup busboy tmp dir
    // const tmpDir = path.join(tmpPath, req.files.file.uuid)
    await deleteFileOrDir(tmpPath);
})

// Créer un fichier dans {folder}
app.put('/api/drive/:folder', async (req, res) => {
    // File is already magically uploaded to tmpPath thanks to busboy.
    console.log("Uploading file into folder : ", req.params.folder);
    console.log(req.files);
    // move file to the correct location :
    const destDir = path.join(os.tmpdir(), "alpsdrive", req.params.folder);
    const destFile = path.join(destDir , req.files.file.filename);
    await fs.promises.rename(req.files.file.file, destFile);
    // display directory again... with the file removed :
    await getDirectoryContents(destDir, res);
    // cleanup busboy tmp dir
    await deleteFileOrDir(tmpPath);
})

// Start server : listen on port
export function start() {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`)
    })
}


