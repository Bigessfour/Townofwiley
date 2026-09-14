# Bedrock Multi-Model AI Assistant

Code Platoon Day 1 challenge: a Python CLI assistant that routes prompts to the best Amazon Bedrock model, tracks token usage, and handles errors gracefully.

## Setup

```bash
cd bedrock-assistant
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Configure AWS credentials and region:

```bash
aws configure
# or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION in .env
```

Enable **Nova Lite**, **Nova Micro**, and **Nova Pro** in the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock/) (Model access).

## Usage

**Interactive CLI:**

```bash
python main.py
```

**Local tests (no AWS required):**

```bash
python test_assistant.py
```

**Full demo (requires Bedrock access):**

```bash
python demo_cli.py
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `/models` | List registered models |
| `/usage` | Show session usage report |
| `/reset` | Clear usage tracking |
| `/use <model>` | Force a specific model |
| `/auto` | Return to automatic routing |
| `/help` | Show command help |
| `quit` | Exit |

## Project Structure

```
bedrock-assistant/
├── src/
│   ├── models.py    # Model registry
│   ├── router.py    # Task detection and routing
│   ├── client.py    # Bedrock client with retries
│   └── tracker.py   # Usage and cost tracking
├── main.py          # Interactive CLI
├── test_assistant.py
├── demo_cli.py
├── requirements.txt
└── .env
```
