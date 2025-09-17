import { Module } from '@nestjs/common';
import { VectorService } from './vector.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [VectorService],
  exports: [VectorService],
})
export class VectorModule {}
