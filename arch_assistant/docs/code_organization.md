# Code Organization for arch_assistant

This document outlines the organization and purpose of the JavaScript files and prompt templates within the `arch_assistant` directory.

## JavaScript Files

### `main.js`

*   **Purpose:** This is the main entry point for the `arch-review` command-line tool. It orchestrates the entire architecture review process.
*   **Functionality:**
    *   Parses command-line arguments using `commander`.
    *   Reads input from a specified file or standard input (`getInputText`).
    *   Loads prompt templates (`getPromptFromFile`).
    *   Performs the initial architecture analysis using the base review prompt (`performInitialAnalysis`).
    *   Optionally performs a deep-dive analysis using the deep dive prompt (`performDeepDiveAnalysis`).
    *   Optionally initiates the ADR generation process (`processADRGeneration`).
        *   Extracts architectural decisions from the analysis (`getArchitecturalDecisions`).
        *   Parses the list of decisions (`parseDecisionsList`).
        *   Prompts the user to select decisions for ADR generation (`promptUserForDecisionSelection`).
        *   Generates ADR content for selected decisions (`generateADR`).
        *   Writes ADRs to the specified output directory.
    *   Handles outputting the final analysis result to a file or standard output (`outputResult`).
    *   Interacts with the OpenWebUI API via `openwebui-utils.js`.
    *   Uses utility functions from `utils.js`.
*   **Usage:** This script is intended to be run directly using Node.js (`node main.js [options]`). It imports functions from `utils.js` and `openwebui-utils.js`.

### `utils.js`

*   **Purpose:** Provides general utility functions used throughout the application.
*   **Functionality (based on usage in `main.js`):**
    *   `logProgress`: Logs progress messages to the console.
    *   `readFile`: Reads the content of a file asynchronously.
    *   `readStdin`: Reads content from standard input asynchronously.
    *   `ensureDirectoryExists`: Creates a directory if it doesn't exist.
    *   `createPrompt`: Formats a prompt string by replacing placeholders with content.
*   **Usage:** Imported by `main.js`.

### `openwebui-utils.js`

*   **Purpose:** Encapsulates logic for interacting with an OpenWebUI compatible API.
*   **Functionality (based on usage in `main.js`):**
    *   `createNewChat`: Creates a new chat session with the LLM via the API.
    *   `deleteChat`: Deletes a specific chat session via the API.
    *   `getResponseFromOpenWebUI`: Sends a prompt to a specific chat session and retrieves the LLM's response.
*   **Usage:** Imported by `main.js`.

## Prompt Files

These files contain the text templates used to instruct the Large Language Model (LLM) for different stages of the analysis.

### `base_review_prompt.txt`

*   **Purpose:** Defines the prompt for the initial analysis phase. It instructs the LLM to act as a software architect, review a design document, and extract key information.
*   **Expected Output:** A JSON object containing:
    *   Core Components
    *   Key Design Decisions
    *   Open Questions
    *   Assumptions
    *   Potential Risks
*   **Usage:** Loaded and used by `performInitialAnalysis` in `main.js`.

### `deep_dive_prompt.txt`

*   **Purpose:** Defines the prompt for the optional second analysis phase (deep dive). It instructs the LLM to generate specific, detailed follow-up questions based on the original document and the initial analysis.
*   **Focus Areas:** Clarifying ambiguity, challenging assumptions, exploring edge cases, validating decisions, scalability, reliability, dependencies.
*   **Expected Output:** A Markdown formatted list of prioritized questions.
*   **Usage:** Loaded and used by `performDeepDiveAnalysis` in `main.js`.

### `list_decisions_prompt.txt`

*   **Purpose:** Defines a simple prompt to extract a list of architectural decisions made within the provided context (which includes the analysis results and original content).
*   **Expected Output:** A list (ideally JSON, but fallback parsing exists) summarizing each decision.
*   **Usage:** Loaded and used by `getArchitecturalDecisions` in `main.js` as the first step in the ADR generation process.

### `generate_adr_prompt.txt`

*   **Purpose:** Provides comprehensive guidelines and a template structure for the LLM to generate Architecture Decision Records (ADRs). It specifies the required input (context including the specific decision, overall analysis, and original content) and the desired output format (Markdown ADR with Context, Decision, and Consequences sections).
*   **Expected Output:** A well-structured ADR in Markdown format for a single architectural decision.
*   **Usage:** Loaded and used by `generateADR` in `main.js` for each selected decision during ADR generation. 