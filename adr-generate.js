const fs = require('fs').promises;
const axios = require('axios');

const BASE_URL = "https://cohost.gue5ty.com";
const GUEST_OPENWEB_UI_URL = `${BASE_URL}/api/chat/completions`;
const NEW_CHAT_URL = `${BASE_URL}/api/v1/chats/new`;
const apiKey = process.env.OPENWEBUI_API_KEY;
const MODEL = 'claude-sonnet-35';

function readFile(fileName) {
    return fs.readFile(fileName, 'utf8')
        .catch(error => {
            console.error(`Error: File '${fileName}' not found.`);
            process.exit(1);
        });
}

function createPrompt(fileContent) {
    // Predefined prompt. Modify this as needed.
    let adrPrompt = `The following discussion (in <discussion> tags below) is a design discussion. Given the document, summarize the decisions from it.
                    Each decision should be summarized into an Architecture Decision Record format: A "Context" section describing the discussion and the different view points. A "Decision" section describing the final decision made. A "Consequences" section describing any outcome and expected consequences of the decision.
                    Summarize the discussion and clearly articulate the decision outlined in it, specifically on why to use CDC.
                    Output the text in Markdown format, where each section has a H2 ('##') header, with the corresponding section name. Use the first person plural form (e.g. "We considered...", "We decided...") Output only the markdown text and nothing more. 
                    The discussion:
                    <discussion>${fileContent}<discussion>`;
    return adrPrompt;
}

async function createNewChat() {
    try {
        const newChatPayload = {
            "chat" : {
                "id" : "",
                "title" : "new title",
                "model": "claude-sonnet-35",
                "messages": []
            }
        }
        const response = await axios.post(NEW_CHAT_URL, newChatPayload, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });
        return response.data.id; // Assuming the API returns the chat ID in the 'id' field
    } catch (error) {
        console.error(`Error creating new chat: ${error.message}`);
        process.exit(1);
    }
}

async function getResponseFromOpenWebUI(prompt,chatID) {
    const url = GUEST_OPENWEB_UI_URL
    
    const data = {
        chat_id : chatID,
        model: MODEL,
        stream : false,
        messages: [{ role: "user", content: prompt }]
    };
    
    try {
        const response = await axios.post(url, data, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` 
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error(`Error communicating with OpenWebUI: ${error.message}`);
        process.exit(1);
    }
}

async function readStdin() {
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

async function getInputOrDie() 
{
    let fileContent = '';
    if (process.argv.length === 3) {
        // Read from file
        const fileName = process.argv[2];
        fileContent = await readFile(fileName);
    } else if (process.argv.length === 2) {
        // Read from stdin
        fileContent = await readStdin();
    } else {
        console.log("Usage: node script.js [filename]");
        console.log("If no filename is provided, input will be read from stdin.");
        process.exit(1);
    }
    return fileContent
}

async function main() {
    
    let input = await getInputOrDie();
    const prompt = createPrompt(input);

    const chatId = await createNewChat();
    const response = await getResponseFromOpenWebUI(prompt,chatId);
    
    // console.log("Response from Claude Sonnet 3.5:");
    console.log(response);
}

main().catch(error => {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
});