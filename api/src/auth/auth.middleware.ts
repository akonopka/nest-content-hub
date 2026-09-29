import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.headers.authorization) {
      const base64 = req.headers.authorization.split(' ')[1]; // bierze to, co po spacji
      const decoded = atob(base64);

      if (decoded == process.env.AUTH_LOGIN + ':' + process.env.AUTH_PASS) {
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
