import { Injectable } from '@nestjs/common';
import * as fs from 'fs'
import { MongoClient } from 'mongodb';
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";

@Injectable()
export class AppService {

  async gpt3() {
    const llamaindex = await import('llamaindex');
    const { Document, VectorStoreIndex } = llamaindex;
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

  async fromDocuments() {
    const llamaindex = await import('llamaindex');
    const { Ollama,  Document, Refine, ResponseSynthesizer, VectorStoreIndex, serviceContextFromDefaults, HuggingFaceEmbedding } = llamaindex;
    const ollamaLLM = new Ollama({baseURL: 'http://127.0.0.1:11434', model: 'mistral', requestTimeout: 50000})
    const embedModel = new HuggingFaceEmbedding({modelType: 'Xenova/all-mpnet-base-v2'})

    const serviceContext = serviceContextFromDefaults({
      llm: ollamaLLM,
      embedModel: embedModel,
      chunkSize: 512,
      chunkOverlap: 20,
    })

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

    console.log({
      nodeParse: index.serviceContext.nodeParser,
      embed: index.serviceContext.embedModel,
      llm: index.serviceContext.llm,
      template: index.serviceContext.promptHelper,
    })

    const queryEngine = index.asQueryEngine({responseSynthesizer});
    const response = await queryEngine.query({
      query: 'Que autos tienes con precios de entre 50 000 y 170 000?'
    });
  
    console.log(response.response);
    return 'Llama2!';
  }

  async fromVectoreStore() {
    const llamaindex = await import('llamaindex');
    const { Ollama, MongoDBAtlasVectorSearch, OpenAIEmbedding,  Document, Refine, ResponseSynthesizer, VectorStoreIndex, serviceContextFromDefaults, HuggingFaceEmbedding } = llamaindex;
    // const ollamaLLM = new Ollama({baseURL: 'http://127.0.0.1:11434', model: 'llama2'})
    // const embedModel = new HuggingFaceEmbedding({modelType: 'Xenova/all-mpnet-base-v2'})
    // const embedModel = new OpenAIEmbedding({
    //   model: "text-embedding-3-small",
    //   dimensions: 1536,
    // });
    const client = new MongoClient(process.env.MONGODB_ATLAS_URI || "")
    await client.connect()
    const vectoreStore = new MongoDBAtlasVectorSearch({
      mongodbClient: client,
      dbName: 'twitter',
      collectionName: 'twitter_comments',
      indexName: 'twitter_comments',
      // embeddingKey: 'embedding',
      // flatMetadata: false,
      // metadataKey: 'metadata',
    });

    const serviceContext = serviceContextFromDefaults()
    const index = await VectorStoreIndex.fromVectorStore(vectoreStore, serviceContext);

    console.log({
      my_configurations: {
        nodeParse: index.serviceContext.nodeParser,
        embed: index.serviceContext.embedModel,
        llm: index.serviceContext.llm,
        template: index.serviceContext.promptHelper,
      }
    })

    const retriever = index.asRetriever({ similarityTopK: 20 });
    const response = await retriever.retrieve('Muestra los comentarios de felicitaciones?');
    // const queryEngine = index.asQueryEngine({retriever});
    // const response = await queryEngine.query({
    //   query: 'Hay comentarios de odio?'
    // });
    await client.close()

    console.log(response);
  
    return 'Llama2!';
  }

  async loadData() {
    const llamaindex = await import('llamaindex');
    const { Document, HuggingFaceEmbedding, VectorStoreIndex, MongoDBAtlasVectorSearch, OpenAIEmbedding, SimpleMongoReader, serviceContextFromDefaults, storageContextFromDefaults } = llamaindex;
    const client = new MongoClient(process.env.MONGODB_ATLAS_URI || "")
    const reader = new SimpleMongoReader(client);
    const documents = await reader.loadData('twitter', 'twitter_post', [
      "name",
    ],'',{},10);

    console.log(documents);

    const vectorStore = new MongoDBAtlasVectorSearch({
      mongodbClient: client,
      dbName: 'twitter',
      collectionName: 'twitter_comments',
      indexName: 'twitter_comments',
      // embeddingKey: 'embedding',
      // flatMetadata: false,
      // metadataKey: 'tomatoes',
    });

    // const embedModel = new OpenAIEmbedding({
    //   model: "text-embedding-3-small",
    // });
    const embedModel = new HuggingFaceEmbedding({modelType: 'Xenova/all-mpnet-base-v2'})

    const serviceContext = serviceContextFromDefaults()
    const storageContext = await storageContextFromDefaults({ vectorStore });

    await VectorStoreIndex.fromDocuments(documents, { serviceContext, storageContext });

    console.log(
      `Successfully created embeddings in the MongoDB collection`,
    );
    await client.close();

  
    return 'Load data!';
  }
}
