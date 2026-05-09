import { Router } from 'express';
import { LeaderboardController } from '../controllers/leaderboard.controller';
import { LeaderboardService } from '../services/leaderboard.service';
import { LeaderboardRepository } from '../repositories/leaderboard.repository';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncWrap } from '../middleware/error.middleware';

const router = Router();
const ctrl = new LeaderboardController(new LeaderboardService(new LeaderboardRepository()));

router.get('/',    asyncWrap((req, res) => ctrl.getTop(req, res)));
router.get('/me',  requireAuth, asyncWrap((req, res) => ctrl.getMyRank(req as any, res)));

export default router;
