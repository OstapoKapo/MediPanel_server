import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const userID = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): number => {
        const req = ctx.switchToHttp().getRequest();
        return req.userID;
    }
)