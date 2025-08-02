import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { RedisService } from "src/redis/redis.service";

const csrfWhiteList = ['/auth/logIn', '/auth/verifyPassword', '/auth/logOut'];
const csrfWhiteListMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
    constructor(
        private readonly redisService: RedisService
    ){}

    async use(req: Request, res: Response, next: NextFunction){
        if(csrfWhiteListMethods.includes(req.method) && !csrfWhiteList.includes(req.path)) {
            const sessionId = req.cookies.sessionId;
            const csrfHeader = req.headers['x-csrf-token'];

            if(!sessionId || !csrfHeader) throw new ForbiddenException('Mising CSRF token or session id');

            const session = await this.redisService.get<{csrfToken: string}>(`session: ${sessionId}`);
            if(!session || session.csrfToken !== csrfHeader) throw new ForbiddenException('Invalid CSRF Token');
        }
        next();
    }
}