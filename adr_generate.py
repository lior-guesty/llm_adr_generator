#!/usr/bin/env python3

import os
import sys
import openai
import argparse
from openai import OpenAI

def read_input(file_path=None):
    """
    Reads input from a file if a file path is provided, otherwise reads from standard input.

    Args:
        file_path (str, optional): The path to the file to read from. If not provided, reads from standard input.

    Returns:
        str: The content read from the file or standard input.

    Raises:
        FileNotFoundError: If the specified file does not exist.
    """
    if file_path:
        try:
            with open(file_path, 'r') as file:
                return file.read()
        except FileNotFoundError:
            stop_with_error(f"File {file_path} not found.",1)
    else:
        say("Reading from stdin")
        return sys.stdin.read()

def read_prompt(prompt_file):
    """
    Reads the content of a prompt file.

    Args:
        prompt_file (str): The name of the prompt file to read.

    Returns:
        str: The content of the prompt file.

    Raises:
        FileNotFoundError: If the prompt file does not exist.

    Note:
        The function constructs the full path to the prompt file based on the
        directory of the current script.
    """
    script_dir = os.path.dirname(os.path.realpath(__file__))
    prompt_path = os.path.join(script_dir, prompt_file)
    try:
        with open(prompt_path, 'r') as file:
            return file.read()
    except FileNotFoundError:
        stop_with_error(f"Prompt file {prompt_path} not found.",2)

def generate_adr(design_text, prompt, model, api_key):
    """
    Generates an Architecture Decision Record (ADR) using the OpenAI API.
    Args:
        design_text (str): The design text to be included in the ADR.
        prompt (str): The prompt to guide the OpenAI model.
        model (str): The OpenAI model to use for generating the ADR.
        api_key (str): The API key for authenticating with the OpenAI API.
    Returns:
        str: The generated ADR content.
    Raises:
        SystemExit: If the API key is not provided or if there is an error with the OpenAI API.
    """
    openai.api_key = api_key
    
    if openai.api_key is None:
        stop_with_error("Error: Please provide an OpenAI API key either through the command line or environment variable.",3)


    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(  model=model,
                                                    messages=[
                                                        {"role": "system", "content": prompt},
                                                        {"role": "user", "content": design_text}
                                                    ],
                                                    max_tokens=500,
                                                    temperature=0.7)

        return response.choices[0].message.content.strip()
    
    except openai.OpenAIError as e:
        stop_with_error(f"Error with OpenAI API: {str(e)}",4)


def write_output(output_text, output_file):
    """
    Writes the given text to the specified output file.

    Args:
        output_text (str): The text to be written to the file.
        output_file (str): The path to the file where the text will be written.

    Raises:
        IOError: If there is an error writing to the file.
    """
    try:
        with open(output_file, 'w') as file:
            file.write(output_text)
    except IOError:
        stop_with_error(f"Error writing to {output_file}",5)

def stop_with_error(msg,code=1):
    """
    Print an error message and exit the program.
    """
    print(msg,file=sys.stderr)
    sys.exit(code)

def parse_arguments():
    """
    Parse CLI arguments using argparse.
    """
    parser = argparse.ArgumentParser(description="Generate an Architecture Decision Record (ADR) using OpenAI Model.")
    
    # Define the optional parameters
    parser.add_argument('-i', '--input', type=str, help="Input text file with design discussion", default=None)
    parser.add_argument('-p', '--prompt', type=str, help="Prompt file to use", default="prompt.txt")
    parser.add_argument('-o', '--output', type=str, help="Output file for the ADR", default="adr.md")
    parser.add_argument('-m', '--model', type=str, help="OpenAI model to use", default="gpt-4")
    parser.add_argument('-k', '--api_key', type=str, help="OpenAI API key", default=os.getenv("OPENAI_API_KEY"))
    
    return parser.parse_args()

def say(message):
    """
    Print the given message.
    """
    print(message)

def main():

    args = parse_arguments()

    design_text = read_input(args.input)
    
    prompt = read_prompt(args.prompt)

    say(f"Generating ADR using model {args.model}")
    adr = generate_adr(design_text, prompt, args.model, args.api_key)

    say(f"Writing output to {args.output}")
    write_output(adr, args.output)

    say("Done!")
   

if __name__ == "__main__":
    main()
