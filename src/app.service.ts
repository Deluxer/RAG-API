import { Injectable } from '@nestjs/common';
import * as fs from 'fs'
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
  
    // Output response
    console.log(response.toString());
    return 'GPT3!';
  }

  async llama2() {
    const llamaindex = await import('llamaindex');
    const { Ollama, Document, Refine, CompactAndRefine, TreeSummarize, SimpleResponseBuilder, ResponseSynthesizer, VectorStoreIndex, serviceContextFromDefaults, HuggingFaceEmbedding } = llamaindex;
    const ollamaLLM = new Ollama({baseURL: 'http://127.0.0.1:11434', model: 'mistral'})
    const embedLLM = new HuggingFaceEmbedding({modelType: 'Xenova/all-mpnet-base-v2'})
    const data = fs.readFileSync(
      "src/dataset/cars_dataset.txt",
      "utf-8",
    );

    const document = new Document({ text: data });
    const serviceContext = serviceContextFromDefaults({llm: ollamaLLM, embedModel: embedLLM})
    const index = await VectorStoreIndex.fromDocuments([document], {
      serviceContext: serviceContext
    });

    // console.log({
    //   embeding: index.serviceContext.embedModel
    // })

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
      query: 'Dame el precio del auto mas barato'
    });
  
    console.log(response.toString());
    return 'Llama2!';
  }
}
