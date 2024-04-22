import { Ollama, Document, VectorStoreIndex, Refine, ResponseSynthesizer, serviceContextFromDefaults, HuggingFaceEmbedding, SimpleMongoReader, MongoDBAtlasVectorSearch, storageContextFromDefaults, TreeSummarize, OpenAIEmbedding, ContextChatEngine, OpenAI } from 'llamaindex';
import * as fs from 'fs'
import { MongoClient } from 'mongodb';
import { Injectable } from '@nestjs/common';
import { ParamsDto } from './dto/params.dto';
import { ChatMessage } from './entities/message.entity';

@Injectable()
export class AppService {
  private mongoUri: string;
  private databaseName: string;
  private collectionName: string;
  private vectorCollectionName: string;
  private indexName: string;

  constructor() {
    this.mongoUri = process.env.MONGODB_URI!;
    this.databaseName = process.env.MONGODB_DATABASE!;
    this.collectionName = process.env.MONGODB_COLLECTION!;
    this.vectorCollectionName = process.env.MONGODB_VECTORS!;
    this.indexName = process.env.MONGODB_VECTOR_INDEX!;
  }

  async gpt3() {
    const data = fs.readFileSync(
      "src/dataset/cars_dataset.txt",
      "utf-8",
    );

    const document = new Document({ text: data });
    const index = await VectorStoreIndex.fromDocuments([document]);

    const queryEngine = index.asQueryEngine();
    const response = await queryEngine.query({
      query: 'Dame el precio del auto mas barato'
    });
  
    console.log(response.toString());
    return 'GPT3!';
  }

  async llama2() {
    const ollamaLLM = new Ollama({baseURL: 'http://127.0.0.1:11434', model: 'llama2'})
    const embedLLM = new HuggingFaceEmbedding({modelType: 'Xenova/all-mpnet-base-v2'})
    const serviceContext = serviceContextFromDefaults({llm: ollamaLLM, embedModel: embedLLM})

    const data = fs.readFileSync(
      "src/dataset/cars_dataset.txt",
      "utf-8",
    );
    const document = new Document({ text: data });
    
    const index = await VectorStoreIndex.fromDocuments([document], {
      serviceContext: serviceContext
    });

    const promptTemplate = ({ context = "", query = "" }) => {
        return `Dado al siguiente contexto, responde las siguientes preguntas
        ---------------------
        ${context}
        ---------------------
        pregunta: ${query}
      
        La respuesta debe ser en español y que cumpla con los siguientes criterios.

        1. Empieza con un saludo.
        2. Se breve y conciso
        `;
      };
    const responseSynthesizer = new ResponseSynthesizer({
      responseBuilder: new Refine(serviceContext, promptTemplate)
    })

    const queryEngine = index.asQueryEngine({responseSynthesizer});
    const response = await queryEngine.query({
      query: 'Dame el precio del auto mas economico'
    });
  
    console.log(response.toString());
    return 'Llama2!';
  }

  async loadData() {
    // const embedLLM = new HuggingFaceEmbedding({modelType: 'Xenova/all-mpnet-base-v2'})
    const embedLLM = new OpenAIEmbedding({model: 'text-embedding-3-small', dimensions: 768})
    const serviceContext = serviceContextFromDefaults({embedModel: embedLLM})

    const client = new MongoClient(this.mongoUri);

    const reader = new SimpleMongoReader(client);
    const documents = await reader.loadData(this.databaseName, this.collectionName, [
      "name", "price", "url"
    ],'\n',{}, 431);

    const vectorStore = new MongoDBAtlasVectorSearch({
      mongodbClient: client,
      dbName: this.databaseName,
      collectionName: this.vectorCollectionName,
      indexName: this.indexName,
    });

    const storageContext = await storageContextFromDefaults({ vectorStore });
    await VectorStoreIndex.fromDocuments(documents, { storageContext, serviceContext });
    console.log(
      `Successfully created embeddings in the MongoDB collection ${this.vectorCollectionName}.`,
    );
    await client.close();
  }

  async llmSearch(paramsDto: ParamsDto) {
    const { query, id } = paramsDto;
    const llm = new OpenAI({ model: "gpt-3.5-turbo" });
    const embedLLM = new OpenAIEmbedding({model: 'text-embedding-3-small', dimensions: 768})
    // const embedLLM = new HuggingFaceEmbedding({modelType: 'Xenova/all-mpnet-base-v2'})
    // const llm = new Ollama({baseURL: 'http://127.0.0.1:11434', model: 'llama3'})

    const serviceContext = serviceContextFromDefaults({llm: llm, embedModel: embedLLM})

    const client = new MongoClient(this.mongoUri);
    const chatbotCollection = client.db(this.databaseName).collection<ChatMessage>('messages');
    const vectorStore = new MongoDBAtlasVectorSearch({
      mongodbClient: client,
      dbName: this.databaseName,
      collectionName: this.vectorCollectionName,
      indexName: this.indexName,
    });
    const index = await VectorStoreIndex.fromVectorStore( vectorStore, serviceContext );

    const promptTemplate = ({ context = "", query = "" }) => {
      return `
      Toma la personalidad de un especialista en atencion a clients de la floreria EleganteFlor:

      1. Empieza con un saludo y preguntando para que ocasión es el arreglo floral
      2. Despues pregunta que tipo de flores prefiere la persona
      3. Haz 1-3 preguntas adicionales para entender las necesidades del cliente
      4. De la lista obtenida, recomienda 1-2 arreglos florales acompañado del nombre, precio y url

      Responde en *español* y en cada respuesta envia 1-3 emojis. Divide la respuesta en párrafos de 2-3 oraciones y envia un maximo de 600 caracteres.
      ${query}

      ${context}
      `;
    };
    const retriever = index.asRetriever({ similarityTopK: 5 });
    const chatEngine = new ContextChatEngine({
      chatModel: llm,
      retriever,
      contextSystemPrompt: promptTemplate
    });

    await chatbotCollection.updateOne(
      { id: id },
      { $push: { messages: { role: 'user', content: query } } },
      { upsert: true }
    );

    const chatHistory: ChatMessage = await chatbotCollection.find({ id: id }).next();
    const { messages } = chatHistory;

    const result = await chatEngine.chat({
      message: query,
      chatHistory: messages,
      stream: false,
    });

    await chatbotCollection.updateOne(
      { id: id },
      { $push: { messages: { role: 'assistant', content: result.response } } },
      { upsert: true }
    );

    return result.response;
  }
}
