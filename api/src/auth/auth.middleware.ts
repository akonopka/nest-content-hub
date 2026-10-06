import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.headers.authorization) {
      const base64 = req.headers.authorization.split(' ')[1]; // bierze to, co po spacji
      const decoded = atob(base64);
      const authCredentials =
        process.env.AUTH_LOGIN + ':' + process.env.AUTH_PASS;

      if (
        Buffer.from(decoded).length === Buffer.from(authCredentials).length &&
        timingSafeEqual(Buffer.from(decoded), Buffer.from(authCredentials))
      ) {
        next();
        return;
      }
    }

    res.setHeader(
      'WWW-Authenticate',
      'Basic realm="Access to site", charset="UTF-8"',
    );
    throw new UnauthorizedException();
  }
}
