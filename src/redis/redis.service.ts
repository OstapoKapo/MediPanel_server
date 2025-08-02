import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisTTL } from 'config/redis.config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
    private client: Redis;

    onModuleInit(){
        this.client = new Redis({host: 'localhost', port: 6379});
    }

    multi() {
        return this.client.multi();
    }

    async set(key:string, value: unknown, ttlSeconds?: number){
        const val = JSON.stringify(value);
        if(ttlSeconds){
            await this.client.set(key, val, 'EX', ttlSeconds);
        }else{
            await this.client.set(key, val);
        }

    }

    async incr(key: string): Promise<number> {
        return await this.client.incr(key);
    }

    async expire(key: string, ttlSeconds: number): Promise<void>{
        await this.client.expire(key, ttlSeconds);
    }

    async get<T>(key: string): Promise<T | null>{
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async del(key: string){
        await this.client.del(key);
    }

    async setLoginAttempts(email: string, value: number){
        await this.set(`loginAttempts:${email}`, value, RedisTTL.LOGIN_ATTEMPTS);
    }

    async setBannedUser(email: string){
        await this.set(`bannedUser:${email}`, true, RedisTTL.BANNED_USER);
    }

    async setVerifyToken(verifyToken: string, value: number){
        await this.set(`verifyToken:${verifyToken}`, {value}, RedisTTL.VERIFY_TOKEN);
    }

    async setSession(sessionId: string, value: { userId: number; userRole: string | null; ip: string | undefined ; userAgent: string, csrfToken: string }) {
        await this.set(`session:${sessionId}`, value, RedisTTL.SESSION);
    }
}
