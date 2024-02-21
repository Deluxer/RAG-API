import { Injectable } from '@nestjs/common';
import { Ollama, Document, VectorStoreIndex, Refine, ResponseSynthesizer, serviceContextFromDefaults, HuggingFaceEmbedding, SimpleMongoReader, MongoDBAtlasVectorSearch, storageContextFromDefaults } from 'llamaindex';
import * as fs from 'fs'
import { MongoClient } from 'mongodb';
@Injectable()
export class AppService {

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
    const embedLLM = new HuggingFaceEmbedding({modelType: 'Xenova/all-mpnet-base-v2'})
    const serviceContext = serviceContextFromDefaults({embedModel: embedLLM})

    const mongoUri = process.env.MONGODB_URI!;
    const databaseName = process.env.MONGODB_DATABASE!;
    const collectionName = process.env.MONGODB_COLLECTION!;
    const vectorCollectionName = process.env.MONGODB_VECTORS!;
    const indexName = process.env.MONGODB_VECTOR_INDEX!;

    const client = new MongoClient(mongoUri);

    const reader = new SimpleMongoReader(client);
    const documents = await reader.loadData(databaseName, collectionName, [
      "name",
    ],'',{}, 518);

    const vectorStore = new MongoDBAtlasVectorSearch({
      mongodbClient: client,
      dbName: databaseName,
      collectionName: vectorCollectionName,
      indexName: indexName,
    });

    const storageContext = await storageContextFromDefaults({ vectorStore });
    await VectorStoreIndex.fromDocuments(documents, { storageContext, serviceContext });
    console.log(
      `Successfully created embeddings in the MongoDB collection ${vectorCollectionName}.`,
    );
    await client.close();
  }
}
