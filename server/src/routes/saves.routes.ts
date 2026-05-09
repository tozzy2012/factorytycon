import { Router } from 'express';
import { SavesController } from '../controllers/saves.controller';
import { SavesService } from '../services/saves.service';
import { SavesRepository } from '../repositories/saves.repository';
import { LeaderboardRepository } from '../repositories/leaderboard.repository';
import { UsersRepository } from '../repositories/users.repository';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncWrap } from '../middleware/error.middleware';

const router = Router();
const ctrl = new SavesController(
  new SavesService(new SavesRepository(), new LeaderboardRepository(), new UsersRepository()),
);

router.use(requireAuth);
router.get('/',           asyncWrap((req, res) => ctrl.list(req as any, res)));
router.get('/:slot',      asyncWrap((req, res) => ctrl.load(req as any, res)));
router.post('/:slot',     asyncWrap((req, res) => ctrl.save(req as any, res)));
router.delete('/:slot',   asyncWrap((req, res) => ctrl.delete(req as any, res)));

export default router;
