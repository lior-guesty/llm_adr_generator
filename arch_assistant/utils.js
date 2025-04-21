const fs = require('fs').promises;

function logProgress(message) {
    console.error(`[INFO] ${message}`);
}

function readFile(fileName) {
    return fs.readFile(fileName, 'utf8')
        .catch(error => {
            console.error(`Error: File '${fileName}' not found.`);
            throw new Error(`File '${fileName}' not found`);
        });
}

async function readStdin()
{
    return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');

        process.stdin.on('readable', () => {
            let chunk;
            while ((chunk = process.stdin.read()) !== null) {
                data += chunk;
            }
        });

        process.stdin.on('end', () => {
            resolve(data);
        });

        process.stdin.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Ensures that the specified directory exists, creating it if necessary
 * @param {string} directory - Path to the directory to check/create
 */
async function ensureDirectoryExists(directory) {
    try {
        await fs.mkdir(directory, { recursive: true });
        logProgress(`Ensured directory exists: ${directory}`);
    } catch (error) {
        console.error(`Error creating directory ${directory}: ${error.message}`);
        throw new Error(`Failed to create directory: ${error.message}`);
    }
}

function createPrompt(text, promptTemplate, placeholder="content") {
    
    const ret = promptTemplate.replace(`{${placeholder}}`, text);
    return ret;
}

module.exports = {
    logProgress,
    readFile,
    readStdin,
    ensureDirectoryExists,
    createPrompt
};
