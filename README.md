# ADR Generator

This script generates an Architecture Decision Record (ADR) based on a design discussion.
It uses OpenAI's GPT-4 model to summarize the discussion into a structured ADR format.

## Functionality

The script performs the following steps:
1. Reads the design discussion text from a file or standard input.
2. Reads a predefined prompt from `prompt.txt`.
3. Uses OpenAI's API to generate an ADR based on the design discussion and the prompt.
4. Outputs the generated ADR in Markdown format.

## Requirements

- Python 3.x
- OpenAI Python client library

## Setup
 
1. Clone the repository or download the script.
2. Run the supplied 'setup.sh' script to set up the script.  
    The script:
    1. Installs the `openai` library
    2. Sets the `OPENAI_API_KEY` environment variable with your OpenAI API key, which you need to supply.
    3. Makes the script executable

## Usage

To generate an ADR, run the script with the design discussion text file as an argument:

```sh
./adr_generate.py discussion.txt
```

If no file is provided, the script will read the design discussion from standard input.  
So you can copy the discussion text (e.g. from Slack, google doc, whatever), and supply it on the command line:

```sh
pbpaste | ./adr_generate.py
```

### Customizing the Prompt
You can further refine the generation by supplying a slightly different prompt in `prompt.txt`.  
Note that the script concatenates the discussion text to the prompt inside `<text>` tags.