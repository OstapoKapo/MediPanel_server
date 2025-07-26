import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const UserId = createParamDecorator(
    ( ctx: ExecutionContext): number => {
        const req = ctx.switchToHttp().getRequest();
        return req.userId;
    }
)