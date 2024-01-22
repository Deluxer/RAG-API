import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('llm')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('gpt3')
  gp3() {
    return this.appService.gpt3();
  }

  @Get('llama2')
  llama2() {
    return this.appService.llama2();
  }
}
