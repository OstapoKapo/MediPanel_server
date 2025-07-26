import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request } from "express";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
    constructor(
        private readonly redisService: RedisService
    ){}

    async use(req: Request, next: NextFunction){
        if(['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)){
            const sessionId = req.cookies['sessionId'];
            const csrfHeader = req.headers['x-csrf-token'];

            if(!sessionId || !csrfHeader) throw new ForbiddenException('Mising CSRF token or session id');

            const session = await this.redisService.get<{csrfToken: string}>(`session: ${sessionId}`);
            if(!session || session.csrfToken !== csrfHeader) throw new ForbiddenException('Invalid CSRF Token');
        }
        next();
    }
}