# ADR Generator

This script generates an Architecture Decision Record (ADR) based on a design discussion.
The python version uses OpenAI's GPT-4 model to summarize the discussion into a structured ADR format.
The JS version does the same using the internal OpenWebUI API, and Claude-Sonnet 3.5 model.

## Functionality

### The Python + GPT-4 Version
The script performs the following steps:

1. Reads the design discussion text from a file or standard input.
2. Reads a predefined prompt from `prompt.txt` or other file given as argument.
3. Uses OpenAI's API to generate an ADR based on the design discussion and the prompt.
4. Outputs the generated ADR in Markdown format to the designated file.

#### Requirements

- Python 3.x
- OpenAI Python client library

#### Setup
 
1. Clone the repository or download the script.
2. Run the supplied `setup.sh` script to set up the script.  
    The script:
    1. Installs the `openai` library
    2. Sets the `OPENAI_API_KEY` environment variable with your OpenAI API key, which you need to supply.
    3. Makes the script executable

#### Usage

To generate an ADR, run the script with the appropriate command-line arguments.  

For example:
```sh
./adr_generate.py -i discussion.txt -p prompt.txt -o adr.md -m gpt-4 -k your_api_key_here
```

##### Command Line Arguments

| Argument       | Description                                      | Default                  |
|----------------|--------------------------------------------------|--------------------------|
| `-i`, `--input`| Input text file with design discussion           | None (standard input)                 |
| `-p`, `--prompt`| Prompt file to use                              | prompt.txt                            |
| `-o`, `--output`| Output file for the ADR                         | adr.md                                |
| `-m`, `--model`| OpenAI model to use                              | gpt-4                                 |
| `-k`, `--api_key`| OpenAI API key                                 | Environment variable `OPENAI_API_KEY` |


Use `./adr_generate.py -h` to get a help message.

If no file is provided, the script will read the design discussion from standard input.  
So you can copy the discussion text (e.g. from Slack, google doc, whatever), and supply it on the command line:

```sh
pbpaste | ./adr_generate.py
```

##### Customizing the Prompt
You can further refine the generation by supplying a slightly different prompt in a file other than `prompt.txt` and designating it using the `-p` parameter.  
Note that the script concatenates the discussion text to the prompt inside `<text>` tags.


## The JS + Claude Sonnet 3.5 (OpenWeb UI) Version

The script performs the following steps:

1. Reads the design discussion text from a file or standard input.
2. Uses OpenWebUI (`cohost`) to generate an ADR based on the design discussion.
4. Outputs the generated ADR in Markdown format to the standard output.

### Requirements and Setup

This was tested using node v16.13.
The only library used is axios for http requests. Use `npm i` to install.

You will need to have an API key available for invoking the OpenWebUI.  
This is a one-time operation, see [here](https://docs.openwebui.com/getting-started/advanced-topics/api-endpoints#authentication) how to obtain an API key.  
One you have an API key, set it in the environment using:
```sh
export OPENWEBUI_API_KEY= <YOUR API KEY HERE>
```

### Usage

Invoke from the command line.  Note you're invoking the cohost OpenWebUI, so you will need to be connected to the VPN.
You can specify the input either by naming a text file, or streaming it from standard input.

For example
```sh
> node ./adr-generate.js discussion.txt  > adr.md
```
This will read the text in `discussion.txt` as input, and output the result to `adr.md`.

Another example, reading the input from the clipboard (in macOs):
```sh
pbpaste | node ./adr-generate.js > adr2.md
```

