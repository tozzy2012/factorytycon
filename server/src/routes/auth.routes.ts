import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UsersRepository } from '../repositories/users.repository';
import { TokensRepository } from '../repositories/tokens.repository';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncWrap } from '../middleware/error.middleware';

const router = Router();
const ctrl = new AuthController(
  new AuthService(new UsersRepository(), new TokensRepository()),
);

router.post('/register', asyncWrap((req, res) => ctrl.register(req, res)));
router.post('/login',    asyncWrap((req, res) => ctrl.login(req, res)));
router.post('/refresh',  asyncWrap((req, res) => ctrl.refresh(req, res)));
router.post('/logout',   asyncWrap((req, res) => ctrl.logout(req, res)));
router.get('/me',        requireAuth, asyncWrap((req, res) => ctrl.me(req as any, res)));

export default router;
