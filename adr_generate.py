#!/usr/bin/env python3

import os
import sys
import openai
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
# print ("API key is: " + client.api_key)

default_model = "gpt-4"  # Default model to use

# Read API key from the environment variable

if client.api_key is None:
    print("Error: Please set the OPENAI_API_KEY environment variable.")
    sys.exit(1)

def read_input(file_path=None):
    if file_path:
        try:
            with open(file_path, 'r') as file:
                return file.read()
        except FileNotFoundError:
            print(f"File {file_path} not found.")
            sys.exit(1)
    else:
        return sys.stdin.read()

def read_prompt(prompt_file):
    script_dir = os.path.dirname(os.path.realpath(__file__))
    prompt_path = os.path.join(script_dir, prompt_file)
    try:
        with open(prompt_path, 'r') as file:
            return file.read()
    except FileNotFoundError:
        print(f"Prompt file {prompt_path} not found.")
        sys.exit(1)

def generate_adr(design_text, prompt, model=default_model):
    try:
        response = client.chat.completions.create(model=model,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": design_text}
        ],
        max_tokens=500,
        temperature=0.7)
        return response.choices[0].message.content.strip()
    except openai.OpenAIError as e:
        print(f"Error with OpenAI API: {str(e)}")
        sys.exit(1)

def main():
    if len(sys.argv) > 1:
        design_text = read_input(sys.argv[1])
    else:
        design_text = read_input()

    prompt = read_prompt("prompt.txt")  # The prompt file should be in the same directory
    adr = generate_adr(design_text, prompt, model="gpt-4")  # Change model if needed
    print(adr)

if __name__ == "__main__":
    main()
