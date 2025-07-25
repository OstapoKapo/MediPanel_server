import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
    private client: Redis;

    onModuleInit(){
        this.client = new Redis({host: 'localhost', port: 6379});
    }

    async set(key:string, value: any, ttlSeconds?: number){
        const val = JSON.stringify(value);
        if(ttlSeconds){
            await this.client.set(key, val, 'EX', ttlSeconds);
        }else{
            await this.client.set(key, val);
        }

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
}
