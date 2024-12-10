const { Command } = require('commander');
const fs = require('fs').promises;
const axios = require('axios');

const BASE_URL = "https://cohost.gue5ty.com";
const GUEST_OPENWEB_UI_URL = `${BASE_URL}/api/chat/completions`;
const NEW_CHAT_URL = `${BASE_URL}/api/v1/chats/new`;
const apiKey = process.env.OPENWEBUI_API_KEY;
const MODEL = 'claude-sonnet-35';
const DEFAULT_PROMPT_TEMPLATE = 'adr-prompt.txt';

function readFile(fileName) {
    return fs.readFile(fileName, 'utf8')
        .catch(error => {
            console.error(`Error: File '${fileName}' not found.`);
            process.exit(1);
        });
}

function createPrompt(discussion, promptTemplate) {
    
    const adrPrompt = promptTemplate.replace('{discussion}', discussion);
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

async function main() {
    const program = new Command();

    program
        .name('adr-generate')
        .description('Generate Architecture Decision Records (ADRs) from discussions using AI')
        .version('1.0.0')
        .option('-i, --input <file>', 'input file (defaults to reading from stdin)', null)
        .option('-o, --output <file>', 'output file (defaults to writing to stdout)', null)
        .option('-p, --prompt <file>', 'prompt file', 'default_claude_adr_prompt.txt');

    program.parse(process.argv);

    const options = program.opts();

    let inputContent = '';
    if (options.input) {
        inputContent = await readFile(options.input);
    } else {
        inputContent = await readStdin();
    }

    let prompt = '';
    if (!options.prompt) { throw new Error('Prompt file is required'); }
    const promptTemplate = await readFile(options.prompt);
    prompt = createPrompt(inputContent, promptTemplate);

    const chatId = await createNewChat();
    const response = await getResponseFromOpenWebUI(prompt, chatId);

    if (options.output) {
        await fs.writeFile(options.output, response, 'utf8');
    } else {
        console.log(response);
    }
}

main().catch(error => {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
});