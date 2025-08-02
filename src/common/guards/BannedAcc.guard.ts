import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class BannedAccGuard implements CanActivate {
    constructor(
        private readonly redisService: RedisService, // Assuming you have a RedisService to interact with Redis
    ){}
    async canActivate(context: ExecutionContext): Promise<boolean>  {
        const request = context.switchToHttp().getRequest();
        const dto = request.body;

        const bannedUser = await this.redisService.get(`bannedUser:${dto.email}`);
        if(bannedUser) throw new UnauthorizedException('Account is banned for 1 hour due to too many failed attempts');
        return true;
    }
}