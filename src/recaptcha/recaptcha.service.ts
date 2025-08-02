import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RecaptchaService {
    private readonly secretKey = process.env.RECAPTCHA_SECRET_KEY;

    async verifyToken(token: string): Promise<boolean>{
        try{
            const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`,
            null, {
                params:{
                    secret: this.secretKey,
                    response: token
                }
            });
            return response.data.success
        }catch(error){
        return false 
        }
    }
}
