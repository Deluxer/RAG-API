import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('gpt3/read-file')
  gp3() {
    return this.appService.gpt3();
  }

  @Get('llama2/read-file')
  llama2() {
    return this.appService.llama2();
  }

  @Get('llama2/load-data')
  loadData() {
    return this.appService.loadData();
  }
}
