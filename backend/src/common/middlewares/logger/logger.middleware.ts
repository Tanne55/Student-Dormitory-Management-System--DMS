import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next:NextFunction) {
    console.log(`[${req.method}] ${req.originalUrl}`);
    console.log(`Request body: ${JSON.stringify(req.body)} or params: ${JSON.stringify(req.params)} or query: ${JSON.stringify(req.query)}  `);
    next();
  }
}
