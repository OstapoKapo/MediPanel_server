import { NextFunction, Request, Response } from "express";
import {v4 as uuidv4} from 'uuid';

export function CorrelationIdMiddleware(req: Request, res: Response, next: NextFunction){
    const correlationId = uuidv4();
    req['correlationId'] = correlationId; 
    res.setHeader('X-correlation-id', correlationId);
    next();
}