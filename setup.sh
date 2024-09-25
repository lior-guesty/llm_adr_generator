#!/bin/bash

# Prompt the user for the OpenAI API key
read -p "Enter your OpenAI API key: " OPENAI_API_KEY

# Install the openai library
pip install openai

# Set the environment variable for the API key
export OPENAI_API_KEY=$OPENAI_API_KEY

# Add the environment variable to the shell profile for persistence
echo "export OPENAI_API_KEY=$OPENAI_API_KEY" >> ~/.bash_profile

# Make the 'adr_generate.py' script executable
chmod +x adr_generate.py

echo "Setup complete. The OpenAI API key has been set and 'adr_generate.py' is now executable."