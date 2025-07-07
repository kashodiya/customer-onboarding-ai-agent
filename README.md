

## Project description
- This is a PoC project 

## Project design
- 'client' folder contains Angular frontend app.
    - dist folder in that will contain the compiled app
- main.py is the main server code


## How to setup dev env
- Git clone
```bash
pip install -r requirements.txt
```

## How to start server in dev mode
- Set env var PASS with a password
- On windows do: run.bat
- On login enter anything for user name and PASS value for password

## Install on server
- Copy deployment\new-instance.sh on server
- Follow instruction on the console

## Some questions
- Describe file formats.
- Please describe the complete form that I need to fill in.
- Encryption is required.
- Target service date is 2 days from now
- Target service date is the end of the 3rd quarter
- What are minimal things I still need to provide?
- Transfer time is 11:25

## Brainstorm on how to handle user questions:
- When to use RAG vs System prompt.
- If you use tartergy to use the scrore from RAG and LLM chat and user higer one.
    - Instead of doing this user LLM to merge both the answers. 
    - Note that answer can come from System prompt or RAG. Or, it can come from both partially and we need to merge it? 
- Strategy 1
    - Ask to LLM (answewr come from System Prompt) as well as RAG in parallel and combine it. Before combining, check if RAG confidence score is low. 