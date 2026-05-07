import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database.config';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: databaseConfig

    })],
    exports: [TypeOrmModule],
})

export class DatabaseModule { }
