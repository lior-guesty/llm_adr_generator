const { Command } = require('commander');
const fs = require('fs').promises;
const axios = require('axios');

const BASE_URL = "https://cohost.gue5ty.com";
const GUEST_OPENWEB_UI_URL = `${BASE_URL}/api/chat/completions`;
const NEW_CHAT_URL = `${BASE_URL}/api/v1/chats/new`;
const DELETE_CHAT_URL = `${BASE_URL}/api/v1/chats/{ID}`
const apiKey = process.env.OPENWEBUI_API_KEY;
// const MODEL = 'claude-sonnet-35';
const MODEL = 'aws_bedrock_claude_pipeline.anthropic.claude-3-5-sonnet-20241022-v2:0';
const FIRST_CHOICE = 0;
const DEFAULT_PROMPT_TEMPLATE = 'adr-prompt.txt';

const DEFAULT_REQUEST_OPTIONS = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    }
};

const ERR_CREATE_CHAT = 1;
const ERR_DELETE_CHAT = 2;
const ERR_GET_CHAT_RESPONSE = 3;
const ERR_UNEXPECTED = 4;
const ERR_READ_FILE = 5;

function readFile(fileName) {
    return fs.readFile(fileName, 'utf8')
        .catch(error => {
            console.error(`Error: File '${fileName}' not found.`);
            process.exit(ERR_READ_FILE);
        });
}

function createPrompt(discussion, promptTemplate) {
    
    const adrPrompt = promptTemplate.replace('{discussion}', discussion);
    return adrPrompt;
}

async function createNewChat()
{
    try
    {
        const newChatPayload =
        {
            "chat" : {
                "id" : "",
                "title" : "new title",
                "model": MODEL,
                "messages": []
            }
        }
        const response = await axios.post(NEW_CHAT_URL, newChatPayload, DEFAULT_REQUEST_OPTIONS);
        return response.data.id; // Assuming the API returns the chat ID in the 'id' field
    }
    catch (error)
    {
        console.error(`Error creating new chat: ${error.message}`);
        process.exit(ERR_CREATE_CHAT);
    }
}

async function deleteChat(id)
{
    try
    {
        let url = DELETE_CHAT_URL.replace('{ID}',id)
        const response = await axios.delete(url, DEFAULT_REQUEST_OPTIONS)
        return response.data
    }
    catch (err)
    {
        console.error(`Error deleting chat ${err.message}`)
        process.exit(ERR_DELETE_CHAT);
    }
}

async function getResponseFromOpenWebUI(prompt,chatID)
{
    
    const requestData =
    {
        chat_id : chatID,
        model: MODEL,
        stream : false,
        messages: [{ role: "user", content: prompt }]
    };
    
    try
    {
        const response = await axios.post(GUEST_OPENWEB_UI_URL, requestData, DEFAULT_REQUEST_OPTIONS);
        return response.data.choices[FIRST_CHOICE].message.content;
    }
    catch (error)
    {
        console.error(`Error communicating with OpenWebUI: ${error.message}`);
        process.exit(ERR_GET_CHAT_RESPONSE);
    }
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

async function main()
{
    const options = parseInputArgs();

    let chatID = '';
    try
    {
        
        let inputContent = await getInputText(options.input);
        
        let prompt = await getPromptFromFile(options.prompt,inputContent);
        
        chatID = await createNewChat();
        const response = await getResponseFromOpenWebUI(prompt, chatID);
        
        await outputResult(options.output, response);
    }
    catch (error)
    {
        throw error;
    }
    finally
    {
        if (chatID)
            await deleteChat(chatID);
    }
}

main().catch(error => {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(ERR_UNEXPECTED);
});

async function outputResult(outputFile, response)
{
    if (outputFile) {
        await fs.writeFile(outputFile, response, 'utf8');
    } else {
        console.log(response);
    }
}

async function getPromptFromFile(fileName,inputContent)
{
    if (!fileName) { throw new Error('Prompt file is required'); }
    const promptTemplate = await readFile(fileName);
    let prompt = createPrompt(inputContent, promptTemplate);
    return prompt;
}

async function getInputText(input)
{
    return input ? await readFile(input) : await readStdin();
}

function parseInputArgs()
{
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
    return options;
}
