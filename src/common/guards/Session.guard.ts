import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { Request } from "express";


interface AuthenticatedReq extends Request {
    userId: number;
}

@Injectable()
export class SessionGuard implements CanActivate{
    constructor(private redisService: RedisService) {}
    
    async canActivate(context: ExecutionContext): Promise<boolean>{
       const req: Request = context.switchToHttp().getRequest();
       const sessionId = req.cookies.sessionId;
       if(!sessionId) throw new UnauthorizedException('Session ID is missing');

       const sessionKey = `session:${sessionId}`;
       const session = await this.redisService.get<{ userId: number; userRole: string; ip:string; userAgent: string }>(sessionKey);
       if(!session) throw new UnauthorizedException('Session not found');

       await this.redisService.expire(sessionKey, 3600);
    //    const currentIp = this.normalizeIp(req.ip);
    //    if(this.normalizeIp(session.ip) !== currentIp){
    //     throw new UnauthorizedException('IP address mismatch');
    //    }
    //    const userAgent = req.headers['user-agent'] || 'unknown';
    //    if(session.userAgent !== userAgent){
    //     throw new UnauthorizedException('User agent mismatch');
    //    }

       (req as AuthenticatedReq).userId = session.userId;
       return true
    }

    private normalizeIp(ip: string | undefined): string{
        if(!ip) return '';
        if(ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
        const parts = ip.split('.');
        return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : ip;
    }
}