#!/usr/bin/env python3

import os
import sys
import openai
import argparse
from openai import OpenAI

def read_input(file_path=None):
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
    script_dir = os.path.dirname(os.path.realpath(__file__))
    prompt_path = os.path.join(script_dir, prompt_file)
    try:
        with open(prompt_path, 'r') as file:
            return file.read()
    except FileNotFoundError:
        stop_with_error(f"Prompt file {prompt_path} not found.",2)

def generate_adr(design_text, prompt, model, api_key):
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
