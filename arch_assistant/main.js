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
// const DEFAULT_PROMPT_TEMPLATE = 'adr-prompt.txt';
const BASE_REVIEW_PROMPT_TEMPLATE = 'base_review_prompt.txt';
const DEEP_DIVE_PROMPT_TEMPLATE = 'deep_dive_prompt.txt';

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

function logProgress(message) {
    console.error(`[INFO] ${message}`);
}

function readFile(fileName) {
    return fs.readFile(fileName, 'utf8')
        .catch(error => {
            console.error(`Error: File '${fileName}' not found.`);
            process.exit(ERR_READ_FILE);
        });
}

function createPrompt(text, promptTemplate, placeholder="content") {
    
    const ret = promptTemplate.replace(`{${placeholder}}`, text);
    return ret;
}

function createDeepDivePrompt(analysis, content, promptTemplate) {
    let prompt = promptTemplate.replace('{analysis}', analysis);
    prompt = prompt.replace('{content}', content);
    return prompt;
}

async function createNewChat()
{
    try
    {
        logProgress("Creating new chat session...");
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
        logProgress(`Deleting chat session ${id}...`);
        let url = DELETE_CHAT_URL.replace('{ID}',id)
        const response = await axios.delete(url, DEFAULT_REQUEST_OPTIONS)
        logProgress("Chat session deleted successfully");
        return response.data
    }
    catch (err)
    {
        console.error(`Error deleting chat ${err.message}`)
        process.exit(ERR_DELETE_CHAT);
    }
}

async function getResponseFromOpenWebUI(prompt, chatID, stepName = "")
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
        logProgress(`Sending request to OpenWebUI${stepName ? ` for ${stepName}` : ''}...`);
        const response = await axios.post(GUEST_OPENWEB_UI_URL, requestData, DEFAULT_REQUEST_OPTIONS);
        logProgress(`Received response from OpenWebUI${stepName ? ` for ${stepName}` : ''}`);
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
    logProgress("Starting architecture analysis process");
    
    let chatID = '';
    try
    {
        let inputContent = await getInputText(options.input);
        logProgress("Input content loaded successfully");
        
        // First analysis step
        chatID = await createNewChat();
        let prompt = await getPromptFromFile(options.prompt, inputContent);
        const firstStepResponse = await getResponseFromOpenWebUI(prompt, chatID, "initial analysis");
        logProgress("Initial analysis step completed successfully");
        
        // If two-step analysis is enabled
        if (options.deepDive) {
            // Delete the first chat session
            await deleteChat(chatID);
            
            // Create a new chat for the second step
            chatID = await createNewChat();
            
            // Create prompt for deep dive analysis
            const deepDiveTemplate = await readFile(options.deepDivePrompt);
            const deepDivePrompt = createDeepDivePrompt(firstStepResponse, inputContent, deepDiveTemplate);
            
            // Get the second step response
            const secondStepResponse = await getResponseFromOpenWebUI(deepDivePrompt, chatID, "deep dive analysis");
            logProgress("Deep dive analysis step completed successfully");
            
            // Output the final result
            await outputResult(options.output, secondStepResponse);
        } else {
            // Output just the first step response
            await outputResult(options.output, firstStepResponse);
        }
        
        logProgress("Analysis process completed successfully");
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
        logProgress(`Results written to ${outputFile}`);
    } else {
        console.log(response);
        logProgress("Results written to stdout");
    }
}

async function getPromptFromFile(fileName,inputContent)
{
    if (!fileName) { throw new Error('Prompt file is required'); }
    const promptTemplate = await readFile(fileName);
    logProgress(`Loaded prompt template from ${fileName}`);
    let prompt = createPrompt(inputContent, promptTemplate);
    return prompt;
}

async function getInputText(input)
{
    if (input) {
        logProgress(`Reading input from file: ${input}`);
        return await readFile(input);
    } else {
        logProgress("Reading input from stdin...");
        return await readStdin();
    }
}

function parseInputArgs()
{
    const program = new Command();

    program
        .name('arch-review')
        .description('Review Architecture')
        .version('1.0.0')
        .option('-i, --input <file>', 'input file (defaults to reading from stdin)', null)
        .option('-o, --output <file>', 'output file (defaults to writing to stdout)', null)
        .option('-p, --prompt <file>', 'prompt file', BASE_REVIEW_PROMPT_TEMPLATE)
        .option('-d, --deep-dive', 'run second step deep dive analysis', false)
        .option('--deep-dive-prompt <file>', 'prompt file for deep dive analysis', DEEP_DIVE_PROMPT_TEMPLATE);

    program.parse(process.argv);

    const options = program.opts();
    return options;
}
