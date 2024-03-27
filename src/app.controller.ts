import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { ParamsDto } from './dto/params.dto';

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

  @Get('llm/load-data')
  loadData() {
    return this.appService.loadData();
  }

  @Get('llm/search')
  llmSearch(
    @Query() paramsDto: ParamsDto,
  ) {
    return this.appService.llmSearch(paramsDto);
  }
}
