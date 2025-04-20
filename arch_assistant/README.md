# Architecture Analysis Assistant

A command-line tool for automated analysis of software architecture design documents using AI.

## Overview

The Architecture Analysis Assistant helps you evaluate software architecture design documents by performing a two-step analysis process:

1. **Initial Analysis**: Extracts core components, key design decisions, open questions, assumptions, and potential risks from your architecture document.
2. **Deep Dive Analysis** (optional): Provides a more detailed evaluation with architecture assessment, implementation recommendations, and design improvements.

## How It Works

The tool uses Claude AI to analyze your architecture document:

1. The document is processed using the prompts defined in `base_review_prompt.txt` for initial analysis
2. If the deep dive option is enabled, the results from step 1 and the original document are analyzed using `deep_dive_prompt.txt`
3. Results are output to a file or stdout

## Requirements

- Node.js installed
- OpenWebUI API key set as environment variable `OPENWEBUI_API_KEY`

## Command Line Arguments

```
Options:
  -i, --input <file>            Input file (defaults to reading from stdin)
  -o, --output <file>           Output file (defaults to writing to stdout)
  -p, --prompt <file>           Prompt file for initial analysis (default: "base_review_prompt.txt")
  -d, --deep-dive               Run second step deep dive analysis
  --deep-dive-prompt <file>     Prompt file for deep dive analysis (default: "deep_dive_prompt.txt")
  -m, --model <name>            Model name to use for analysis (default: specified in main.js)
  -h, --help                    Display help information
  -v, --version                 Output the version number
```

## Example Usage

### Basic Analysis

Run a basic analysis on an architecture document:

```bash
node main.js -i architecture_doc.txt -o analysis_result.json
```

### Deep Dive Analysis

Perform both initial analysis and deep dive analysis:

```bash
node main.js -i architecture_doc.txt -o full_analysis.txt -d
```

### Using Custom Prompts

Use custom prompt templates:

```bash
node main.js -i architecture_doc.txt -o analysis.txt -p custom_prompt.txt --deep-dive-prompt custom_deep_dive.txt -d
```

### Reading from Stdin

Process text from a pipe:

```bash
cat architecture_doc.txt | node main.js -o analysis.txt
```

## Prompt Files

The tool uses two prompt files:

- **base_review_prompt.txt**: Extracts structured information about components, decisions, risks, etc.
- **deep_dive_prompt.txt**: Provides deeper architectural evaluation and recommendations

You can customize these files to adjust the analysis focus and output format.

## Output

The initial analysis produces structured JSON with the following categories:
- Core Components
- Key Design Decisions
- Open Questions
- Assumptions
- Potential Risks

The deep dive analysis provides more detailed insights in a text format covering questions to evaluate/answer as part of the architecture review.