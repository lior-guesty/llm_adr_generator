const axios = require('axios');
const { logProgress } = require('./utils');

const BASE_URL = "https://cohost.gue5ty.com";
const GUEST_OPENWEB_UI_URL = `${BASE_URL}/api/chat/completions`;
const NEW_CHAT_URL = `${BASE_URL}/api/v1/chats/new`;
const DELETE_CHAT_URL = `${BASE_URL}/api/v1/chats/{ID}`
const apiKey = process.env.OPENWEBUI_API_KEY;

const FIRST_CHOICE = 0;

const DEFAULT_REQUEST_OPTIONS = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    }
};

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

module.exports = {
    createNewChat,
    deleteChat,
    getResponseFromOpenWebUI
};
