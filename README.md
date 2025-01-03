# Llamaindex for JavaScript projects

In this [video](https://youtu.be/eI0w3VGYMnw?si=pxUO6jqleRYJNsXv), I explain step by step how we can do it.

What does this repo contain?

- Load a CSV file, TXT file
- Configure Ollama to use Llama2
- Use and configure a Huggingface embedding model
- Custom Prompt template


## Requirements

Add an .env file and set OPENAI_API_KEY, see [OpenAI api key](https://platform.openai.com/api-keys):
```bash
$ OPENAI_API_KEY='sk-xxxxx'
```

## Vector search index
name: embedded_flowers_index_768
```json
{
  "fields": [
    {
      "numDimensions": 768,
      "path": "embedding",
      "similarity": "euclidean",
      "type": "vector"
    }
  ]
}
```

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

1. Install node
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
source ~/.bashrc

1. Install yarn
curl -o- -L https://yarnpkg.com/install.sh | bash
source ~/.bashrc


source-clone
  - bin/
    - 64bts
      - source-clone.so
  - data/
    - locale/
      - de-DE.ini
      - en-US.ini
      - es-ES.ini
      - pt-BR.ini


## Stay in touch

- Website - [https://mireino.com](https://mireino.com/)
- Twitter - [@GeraDeluxer](https://twitter.com/GeraDeluxer)
