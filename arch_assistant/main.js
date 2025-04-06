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

const BASE_REVIEW_PROMPT_TEMPLATE = 'base_review_prompt.txt';
const DEEP_DIVE_PROMPT_TEMPLATE = 'deep_dive_prompt.txt';

const DEFAULT_REQUEST_OPTIONS = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    }
};

const ERR_UNEXPECTED = 4;

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
        throw new Error(`Failed to create chat: ${error.message}`);
    }
}

async function deleteChat(id)
{
    try
    {
        if (!id) {
            logProgress("No chat ID provided, skipping deletion");
            return;
        }
        logProgress(`Deleting chat session ${id}...`);
        let url = DELETE_CHAT_URL.replace('{ID}',id)
        const response = await axios.delete(url, DEFAULT_REQUEST_OPTIONS)
        logProgress("Chat session deleted successfully");
        return response.data
    }
    catch (err)
    {
        console.error(`Error deleting chat ${err.message}`)
        throw new Error(`Failed to delete chat: ${err.message}`);
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
        throw new Error(`Failed to get response from OpenWebUI: ${error.message}`);
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

/**
 * Performs the initial analysis step using base review prompt
 * @param {string} inputContent - The original document content
 * @param {string} promptTemplate - Path to the prompt template file
 * @returns {Object} - Object containing the analysis result and chat ID
 */
async function performInitialAnalysis(inputContent, promptTemplate) {
    logProgress("Starting initial analysis step");
    
    // Create a new chat
    const chatID = await createNewChat();
    
    try {
        // Load prompt and get response
        const prompt = await getPromptFromFile(promptTemplate, inputContent);
        const result = await getResponseFromOpenWebUI(prompt, chatID, "initial analysis");
        
        logProgress("Initial analysis step completed successfully");
        return { result, chatID };
    } catch (error) {
        // Delete chat if error occurs and rethrow
        await deleteChat(chatID);
        throw error;
    }
}

/**
 * Performs the deep dive analysis step
 * @param {string} initialAnalysis - Result from the initial analysis
 * @param {string} originalContent - The original document content
 * @param {string} promptTemplatePath - Path to the deep dive prompt template
 * @returns {string} - The deep dive analysis result
 */
async function performDeepDiveAnalysis(initialAnalysis, originalContent, promptTemplatePath) {
    logProgress("Starting deep dive analysis step");
    
    // Create a new chat
    const chatID = await createNewChat();
    
    try {
        // Create prompt for deep dive analysis
        const deepDiveTemplate = await readFile(promptTemplatePath);
        const deepDivePrompt = createDeepDivePrompt(initialAnalysis, originalContent, deepDiveTemplate);
        
        // Get the second step response
        const result = await getResponseFromOpenWebUI(deepDivePrompt, chatID, "deep dive analysis");
        
        logProgress("Deep dive analysis step completed successfully");
        return result;
    } finally {
        // Ensure chat is deleted even if error occurs
        await deleteChat(chatID);
    }
}

async function main()
{
    const options = parseInputArgs();
    logProgress("Starting architecture analysis process");
    
    try {
        const inputContent = await getInputText(options.input);
        logProgress("Input content loaded successfully");
        
        const { result: firstStepResponse, chatID: firstChatID } = 
            await performInitialAnalysis(inputContent, options.prompt);
        
        let finalResult;
        
        if (options.deepDive) {
            await deleteChat(firstChatID);
            
            finalResult = await performDeepDiveAnalysis(
                firstStepResponse, 
                inputContent, 
                options.deepDivePrompt
            );
        } else {
            finalResult = firstStepResponse;
        }
        await outputResult(options.output, finalResult);
        
        logProgress("Analysis process completed successfully");
    } catch (error) {
        throw error;
    }
}

main().catch(error => {
    console.error(`Error: ${error.message}`);
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

async function getPromptFromFile(fileName, inputContent)
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
