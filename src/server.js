import express from 'express';
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import bb from 'express-busboy';

const app = express()
const port = 3000

const rootPath = path.join(os.tmpdir(), "alpsdrive");
const tmpPath = path.join(os.tmpdir(), "alpsdrive/tmp");

const badFilenameMsg = "Use only alphanum characters, _ or -, with an optional extension."

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

// ---------------------------------------------------------
// Returns file size
// ---------------------------------------------------------
async function getFileSize(filePath) {
    try {
        const stats = await fs.promises.stat(filePath);
        return stats.size;
    } catch (err) {
        console.log(err.message);
    }
}

// ---------------------------------------------------------
// Returns a list of files and folders in Json format
// ---------------------------------------------------------
async function getDirectoryContents(myPath) {
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
        return filesJson
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// ---------------------------------------------------------
// Returns true if filename exists
// ---------------------------------------------------------
async function fileOrDirExists(filename) {
    console.log("Entering fileOrDirExists with filename = ", filename);
    try {
        await fs.promises.access(filename);
        // The check succeeded
        return true
    } catch (err) {
        // The check failed
        return false
    }
}

// ---------------------------------------------------------
// If it's a directory, returns a list of files/dirs
// If it's a file, returns its content
// ---------------------------------------------------------
async function getContentOr404(myPath, res) {
    try {
        if (!await fileOrDirExists(myPath)) {
            throw 404 ;
        }
        const stats = await fs.promises.stat(myPath);
        if (stats.isDirectory()) {
            res.status(200).send(await getDirectoryContents(myPath, res));
        } else {
            res.status(200).sendFile(myPath, {headers: {'Content-Type': 'application/octet-stream'}});
        }
    } catch (err) {
        // The .status() method on the res object will set a HTTP status code of 404. To send the status code to the
        // client-side, you can method chain using the .send() method : res.status(404).send('Not Found');
        if (err == 404) {
            return res.status(404).send("Erreur 404 : Ce fichier ou dossier n'existe pas !");
        } else {
            return res.status(500).json(err);
        }
    }
}

// ---------------------------------------------------------
// Create directory
// ---------------------------------------------------------
async function createDirectory(dirPath) {
    try {
        await fs.promises.mkdir(dirPath);
    } catch (err) {
        console.error(err);
        throw (err);
    }
}

// ---------------------------------------------------------
// Delete file or directory
// ---------------------------------------------------------
async function deleteFileOrDir(name) {
    return await fs.promises.rm(name, {recursive: true});
}

// ---------------------------------------------------------
// Returns true if file name matches regexp
// ---------------------------------------------------------
function checkFileName(name) {
    // match any name with :
    // - first part : alphanum characters (\w = [a-zA-Z0-9_]) or '-', one or more times (+)
    // - second part : extension : optional (idem)
    const regExp = /^[\w-]+\.?[\w-]+$/;
    return regExp.test(name);
}

// ┏━━━━━━━━━━━━━━━━━━━━━┓
// ┃                     ┃
// ┃    API REQUESTS     ┃
// ┃                     ┃
// ┗━━━━━━━━━━━━━━━━━━━━━┛

// =================================================================
// Retourne une liste contenant les dossiers et fichiers à la racine du “drive”
// =================================================================
// Return status : 200
app.get('/api/drive', async (req, res) => {
    console.log("Processing /api/drive")
    try {
        const filesJson = await getDirectoryContents(rootPath);
        return res.status(200).send(filesJson);
    } catch (err) {
        return res.status(500).json(err);
    }
})

// =================================================================
// Retourne le contenu de {name} : GET /api/drive/{name}
// =================================================================
// Return status : 404 if file/dir does not exist
app.get('/api/drive/:name', async (req, res) => {
    console.log("Processing /api/drive/" + req.params.name);
    const myPath = path.join(os.tmpdir(), "alpsdrive", req.params.name);
    await getContentOr404(myPath, res);
})

app.get('/api/drive/:folder/:name', async (req, res) => {
    console.log("Starting processing /api/drive/" + req.params.folder + "/" + req.params.name);
    const myPath = path.join(os.tmpdir(), "alpsdrive", req.params.folder, req.params.name);
    await getContentOr404(myPath, res);
})

// =================================================================
// Créer un dossier avec le nom {name} : POST /api/drive?name={name}
// =================================================================
// Return status : 400 if name contains non-alphanum characters
app.post('/api/drive', async (req, res) => {
    console.log("Processing 'create directory' with POST request : name=", req.query.name);
    const dirPath = path.join(os.tmpdir(), "alpsdrive", req.query.name);
    // Make sure name contains only allowed alphanumeric characters
    if (!checkFileName(req.query.name)) {
        res.status(400).send(badFilenameMsg);
        return;
    }
    try {
        // Create directory
        await createDirectory(dirPath); // check return status !!
        return res.status(201).send();
    } catch (err) {
        return res.status(500).json(err);
    }
})

// =================================================================
// Créer un dossier avec le nom {name} dans {folder} : POST /api/drive{folder}?name={name}
// =================================================================
// Return status : 400 if name contains non-alphanum characters
// Return status : 404 if folder does not exist
app.post('/api/drive/:folder/', async (req, res) => {
    console.log("Starting processing 'create directory inside folder' with POST request :");
    console.log("Containing folder =", req.params.folder, "- New folder =", req.query.name);
    const dirPath = path.join(os.tmpdir(), "alpsdrive", req.params.folder, req.query.name);
    console.log("Path to create = ", dirPath)

    // Make sure name contains only allowed alphanumeric characters
    if (!checkFileName(req.query.name)) {
        res.status(400).send(badFilenameMsg);
        return;
    }
    if (! await fileOrDirExists(dirPath)) {
        res.sendStatus(404);
    }

    try {
        // Create directory
        await createDirectory(dirPath); // check return status !!
        return res.status(201).send();
    } catch (err) {
        return res.status(500).json(err);
    }
})

// =================================================================
// Suppression d’un dossier ou d’un fichier avec le nom {name} : DELETE /api/drive/{name}
// =================================================================
app.delete('/api/drive/:name', async (req, res) => {
    console.log("Starting processing 'delete' with DELETE request : name=", req.params.name);
    const dirPath = path.join(os.tmpdir(), "alpsdrive", req.params.name);
    console.log(dirPath)
    if (!checkFileName(req.params.name)) {
        res.status(400).send(badFilenameMsg);
        return;
    }
    try {
        await fs.promises.rm(dirPath, {recursive: true}) ;
        res.sendStatus(200);
    } catch (err) {
        console.log("Erreur :", err) ;
        return res.status(500).json(err) ;
    }
})

// =================================================================
// Suppression d’un dossier ou d’un fichier avec le nom {name} dans {folder} : DELETE /api/drive/{folder}/{name}
// =================================================================
app.delete('/api/drive/:folder/:name', async (req, res) => {
    console.log("Starting processing 'delete inside folder' with DELETE request : folder=", req.params.folder, " name=", req.params.name);
    const dirPath = path.join(os.tmpdir(), "alpsdrive", req.params.folder, req.params.name);
    console.log("File or folder to delete =", dirPath);
    if (!checkFileName(req.params.name)) {
        res.status(400).send(badFilenameMsg);
        return;
    }
    try {
        await fs.promises.rm(dirPath, {recursive: true});
        res.sendStatus(200);
    } catch (err) {
        console.log("Erreur :", err) ;
        return res.status(500).json(err);
    }
})

// =================================================================
// Créer un fichier à la racine du “drive : PUT /api/drive
// =================================================================
app.put('/api/drive', async (req, res) => {
    // magically upload file thanks to busboy.
    console.log("Uploading file...");
    try {
        const src = req.files.file.file ;
        const dst = path.join(os.tmpdir(), "alpsdrive", req.files.file.filename) ;
        if (! fileOrDirExists(src)) {
            throw "400"
        }
        // move file to the correct location : racine du drive
        await fs.promises.rename(src, dst);
        res.sendStatus(201);
    } catch (err) {
        if (err == "400") {
            res.sendStatus(400);
        } else {
            res.sendStatus(500);
        }
    }
    // cleanup busboy tmp dir
    await deleteFileOrDir(tmpPath);
})

// =================================================================
// Créer un fichier dans {folder}
// =================================================================
app.put('/api/drive/:folder', async (req, res) => {
    // File is already magically uploaded to tmpPath thanks to busboy.
    console.log("Uploading file into folder : ", req.params.folder);
    console.log(req.files);
    try {
        const src = req.files.file.file ;
        const dst = path.join(os.tmpdir(), "alpsdrive", req.params.folder, req.files.file.filename);
        if (! fileOrDirExists(src)) {
            throw "400"
        }
        // move file to the correct location : racine du drive
        await fs.promises.rename(src, dst);
        res.sendStatus(201);
    } catch (err) {
        if (err == "400") {
            res.sendStatus(400);
        } else {
            res.sendStatus(500);
        }
    }
    // cleanup busboy tmp dir
    await deleteFileOrDir(tmpPath);

})

// =================================================================
// Start server : listen on port
// =================================================================
export function start() {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`)
    })
}


