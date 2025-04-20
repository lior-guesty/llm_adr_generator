const { Command } = require('commander');
const fs = require('fs').promises;
const axios = require('axios');

const BASE_URL = "https://cohost.gue5ty.com";
const GUEST_OPENWEB_UI_URL = `${BASE_URL}/api/chat/completions`;
const NEW_CHAT_URL = `${BASE_URL}/api/v1/chats/new`;
const DELETE_CHAT_URL = `${BASE_URL}/api/v1/chats/{ID}`
const apiKey = process.env.OPENWEBUI_API_KEY;
// const MODEL = 'claude-sonnet-35';
// const MODEL = 'aws_bedrock_claude_pipeline.anthropic.claude-3-5-sonnet-20241022-v2:0';
const DEFAULT_MODEL = 'bedrock.us.anthropic.claude-3-7-sonnet-20250219-v1:0';
const FIRST_CHOICE = 0;

const BASE_REVIEW_PROMPT_TEMPLATE = 'base_review_prompt.txt';
const DEEP_DIVE_PROMPT_TEMPLATE = 'deep_dive_prompt.txt';
const LIST_DECISIONS_PROMPT_TEMPLATE = 'list_decisions_prompt.txt';
const GENERATE_ADR_PROMPT_TEMPLATE = 'generate_adr_prompt.txt';

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

/**
 * Creates a new chat session with the specified model
 * @param {string} model - The model identifier to use for the chat
 * @returns {Promise<string>} - The ID of the newly created chat session
 * @throws {Error} - If chat creation fails
 */
async function createNewChat(model)
{
    try
    {
        logProgress("Creating new chat session...");
        const newChatPayload =
        {
            "chat" : {
                "id" : "",
                "title" : "new title",
                "model": model,
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

/**
 * Sends a prompt to the OpenWebUI API and gets the response
 * @param {string} prompt - The user prompt
 * @param {string} chatID - The ID of the chat session
 * @param {string} model - The model identifier to use
 * @param {string} [stepName=""] - Optional name for the step for logging purposes
 * @returns {Promise<string>} - The content of the AI response
 * @throws {Error} - If communication with the API fails
 */
async function getResponseFromOpenWebUI(prompt, chatID, model, stepName = "")
{
    const requestData =
    {
        chat_id : chatID,
        model: model,
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
        if (error.response) {
            console.error(`API Error Status: ${error.response.status}`);
            console.error(`API Error Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
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
 * @param {string} model - The model identifier to use for analysis
 * @returns {Promise<Object>} - Object containing the analysis result and chat ID
 * @throws {Error} - If analysis fails
 */
async function performInitialAnalysis(inputContent, promptTemplate, model) {
    logProgress("Starting initial analysis step");
    
    // Create a new chat
    const chatID = await createNewChat(model);
    
    try {
        // Load prompt and get response
        const prompt = await getPromptFromFile(promptTemplate, inputContent);
        const result = await getResponseFromOpenWebUI(prompt, chatID, model, "initial analysis");
        
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
 * @param {string} model - The model identifier to use for analysis
 * @returns {Promise<string>} - The deep dive analysis result
 * @throws {Error} - If analysis fails
 */
async function performDeepDiveAnalysis(initialAnalysis, originalContent, promptTemplatePath, model) {
    logProgress("Starting deep dive analysis step");
    
    // Create a new chat
    const chatID = await createNewChat(model);
    
    try {
        // Create prompt for deep dive analysis
        const deepDiveTemplate = await readFile(promptTemplatePath);
        const deepDivePrompt = createDeepDivePrompt(initialAnalysis, originalContent, deepDiveTemplate);
        
        // Get the second step response
        const result = await getResponseFromOpenWebUI(deepDivePrompt, chatID, model, "deep dive analysis");
        
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
            await performInitialAnalysis(inputContent, options.prompt, options.model);
        
        let finalResult;
        
        if (options.deepDive) {
            await deleteChat(firstChatID);
            
            finalResult = await performDeepDiveAnalysis(
                firstStepResponse, 
                inputContent, 
                options.deepDivePrompt,
                options.model
            );
        } else {
            finalResult = firstStepResponse;
            await deleteChat(firstChatID);
        }
        
        await outputResult(options.output, finalResult);
        
        // Process ADR generation if the flag is set
        if (options.generateAdrs) {
            await processADRGeneration(finalResult, inputContent, options);
        }
        
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

/**
 * Gets a list of architectural decisions from the analysis
 * @param {string} analysis - The architecture analysis result
 * @param {string} originalContent - The original input content
 * @param {string} promptTemplatePath - Path to the prompt template for listing decisions
 * @param {string} model - The model identifier to use
 * @returns {Promise<string>} - JSON string containing the list of decisions
 * @throws {Error} - If fetching decisions fails
 */
async function getArchitecturalDecisions(analysis, originalContent, promptTemplatePath, model) {
    logProgress("Getting list of architectural decisions");
    
    // Create a new chat
    const chatID = await createNewChat(model);
    
    try {
        // Load prompt template and create prompt
        const promptTemplate = await readFile(promptTemplatePath);
        
        // Create context with both analysis and original content
        const context = JSON.stringify({
            analysis: analysis,
            originalContent: originalContent
        });
        
        const prompt = createPrompt(context, promptTemplate);
        
        // Get response
        const result = await getResponseFromOpenWebUI(prompt, chatID, model, "list architectural decisions");
        logProgress("Successfully retrieved list of architectural decisions");
        
        return result;
    } finally {
        // Ensure chat is deleted
        await deleteChat(chatID);
    }
}

/**
 * Parses the decisions list response into a structured array of decision objects
 * @param {string} decisionsResponse - The response from the list decisions prompt
 * @returns {Array} - Array of decision objects, each with title and description
 */
function parseDecisionsList(decisionsResponse) {
    logProgress("Parsing decisions list");
    
    try {
        // Attempt to parse as JSON first
        return JSON.parse(decisionsResponse);
    } catch (error) {
        logProgress("Response is not valid JSON, attempting to parse structured text");
        
        // If not JSON, try to parse as structured text
        const decisions = [];
        const lines = decisionsResponse.split('\n');
        
        let currentDecision = null;
        
        for (const line of lines) {
            // Skip empty lines
            if (!line.trim()) continue;
            
            // Check for a new decision (typically numbered or with a title pattern)
            const titleMatch = line.match(/^\d+\.\s*(.+)$/) || line.match(/^Title:\s*(.+)$/i);
            
            if (titleMatch) {
                // If we already have a decision in progress, save it
                if (currentDecision) {
                    decisions.push(currentDecision);
                }
                
                // Start a new decision
                currentDecision = {
                    title: titleMatch[1].trim(),
                    description: ''
                };
            } 
            // Check for description lines
            else if (currentDecision && (line.startsWith('Description:') || line.startsWith('- '))) {
                const description = line.replace(/^(Description:|-)/, '').trim();
                if (description) {
                    currentDecision.description = description;
                }
            }
            // Add to current description if we're in a decision context
            else if (currentDecision && !currentDecision.description) {
                currentDecision.description = line.trim();
            }
        }
        
        // Add the last decision if there is one
        if (currentDecision) {
            decisions.push(currentDecision);
        }
        
        logProgress(`Parsed ${decisions.length} decisions from text format`);
        return decisions;
    }
}

/**
 * Generates an ADR for a specific decision
 * @param {Object} decision - The decision object with title and description
 * @param {string} analysis - The complete architecture analysis
 * @param {string} originalContent - The original input content
 * @param {string} promptTemplatePath - Path to the prompt template for generating ADRs
 * @param {string} model - The model identifier to use
 * @returns {Promise<string>} - The generated ADR content
 * @throws {Error} - If ADR generation fails
 */
async function generateADR(decision, analysis, originalContent, promptTemplatePath, model) {
    logProgress(`Generating ADR for: ${decision.title}`);
    
    // Create a new chat
    const chatID = await createNewChat(model);
    
    try {
        // Create context with the decision, analysis, and original content
        const context = JSON.stringify({
            decision: decision,
            analysis: analysis,
            originalContent: originalContent
        });
        
        // Load prompt template and create prompt
        const promptTemplate = await readFile(promptTemplatePath);
        const prompt = createPrompt(context, promptTemplate);
        
        // Get response
        const result = await getResponseFromOpenWebUI(prompt, chatID, model, `ADR for ${decision.title}`);
        logProgress(`Successfully generated ADR for: ${decision.title}`);
        
        return result;
    } finally {
        // Ensure chat is deleted
        await deleteChat(chatID);
    }
}

/**
 * Prompts the user to select which decisions to generate ADRs for
 * @param {Array} decisions - Array of decision objects
 * @returns {Array} - Array of selected decision objects
 */
async function promptUserForDecisionSelection(decisions) {
    return new Promise((resolve) => {
        // Display the list of decisions
        console.log("\nArchitectural Decisions Identified:");
        decisions.forEach((decision, index) => {
            console.log(`${index + 1}. ${decision.title} - ${decision.description}`);
        });
        
        console.log("\nEnter the numbers of the decisions to generate ADRs for (comma-separated)");
        console.log("Example: 1,3,5 (or 'all' for all decisions, or 'none' to cancel):");
        
        // Set up input handling
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        process.stdin.once('data', (data) => {
            const input = data.toString().trim().toLowerCase();
            
            // Handle 'all' input
            if (input === 'all') {
                process.stdin.pause();
                resolve(decisions);
                return;
            }
            
            // Handle 'none' input
            if (input === 'none') {
                process.stdin.pause();
                resolve([]);
                return;
            }
            
            // Handle numerical selections
            try {
                const selectedIndices = input.split(',').map(num => parseInt(num.trim(), 10) - 1);
                const selectedDecisions = selectedIndices
                    .filter(index => index >= 0 && index < decisions.length)
                    .map(index => decisions[index]);
                
                process.stdin.pause();
                resolve(selectedDecisions);
            } catch (error) {
                console.error("Invalid input, no ADRs will be generated.");
                process.stdin.pause();
                resolve([]);
            }
        });
    });
}

/**
 * Processes the ADR generation workflow
 * @param {string} analysis - The architecture analysis result
 * @param {string} inputContent - The original input content (used for context)
 * @param {Object} options - CLI options, including model, prompts, and output directory
 * @throws {Error} - If ADR processing fails
 */
async function processADRGeneration(analysis, inputContent, options) {
    if (!options.generateAdrs) {
        return;
    }
    
    logProgress("Starting ADR generation process");
    
    try {
        await ensureDirectoryExists(options.adrOutputDir);
        
        const decisionsResponse = await getArchitecturalDecisions(analysis, inputContent, options.listDecisionsPrompt, options.model);
        
        const decisions = parseDecisionsList(decisionsResponse);
        
        if (decisions.length === 0) {
            console.log("No architectural decisions were identified.");
            return;
        }
        
        const selectedDecisions = await promptUserForDecisionSelection(decisions);
        
        if (selectedDecisions.length === 0) {
            console.log("No decisions selected for ADR generation.");
            return;
        }
        
        // Generate ADRs for each selected decision
        for (let i = 0; i < selectedDecisions.length; i++) {
            const decision = selectedDecisions[i];
            logProgress(`Processing ADR ${i + 1} of ${selectedDecisions.length}: ${decision.title}`);
            
            const adrContent = await generateADR(decision, analysis, inputContent, options.generateAdrPrompt, options.model);
            
            const safeFilename = decision.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            
            const adrFilename = `${options.adrOutputDir}/${i + 1}-${safeFilename}.md`;
            
            await fs.writeFile(adrFilename, adrContent, 'utf8');
            console.log(`ADR written to: ${adrFilename}`);
        }
        
        logProgress("ADR generation process completed successfully");
    } catch (error) {
        console.error(`Error in ADR generation: ${error.message}`);
        throw new Error(`ADR generation failed: ${error.message}`);
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
        .option('--deep-dive-prompt <file>', 'prompt file for deep dive analysis', DEEP_DIVE_PROMPT_TEMPLATE)
        .option('-m, --model <name>', 'model name to use for analysis', DEFAULT_MODEL)
        .option('--generate-adrs', 'generate Architecture Decision Records from analysis', false)
        .option('--adr-output-dir <directory>', 'output directory for ADRs', './adrs')
        .option('--list-decisions-prompt <file>', 'prompt file for listing architectural decisions', LIST_DECISIONS_PROMPT_TEMPLATE)
        .option('--generate-adr-prompt <file>', 'prompt file for generating ADR content', GENERATE_ADR_PROMPT_TEMPLATE);

    program.parse(process.argv);

    const options = program.opts();
    return options;
}
