#!/bin/bash

# Create the ~/apps directory if it doesn't exist
if [ ! -d "$HOME/apps" ]; then
    mkdir "$HOME/apps"
fi

# Find the next available port number
start_port=7160
while [ -d "$HOME/apps/$start_port" ]; do
    start_port=$((start_port + 1))
done

# Create a new directory for the application
new_dir="$HOME/apps/$start_port"
mkdir "$new_dir"

# Clone the repository and install dependencies
git clone https://github.com/kashodiya/customer-onboarding-ai-agent "$new_dir"
cd "$new_dir"
pip install -r requirements.txt


# Generate a 6-digit random number string
RANDOM_NUMBER=$(printf "%06d" $((RANDOM % 1000000)))

# Create the start.sh file
cat << EOF > start.sh
export PASS=$RANDOM_NUMBER
uvicorn main:app --reload --port $start_port --host 0.0.0.0
EOF

# Make the start.sh file executable
chmod +x start.sh

echo "start.sh file created with password: $RANDOM_NUMBER"

echo App is installed in $new_dir. Run using start.sh.
