import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import { adminAuthRouter } from './auth';
import { adminCatalogRouter } from './catalog';
import { adminMetricsRouter } from './metrics';
import { adminOrdersRouter } from './orders';

/** /api/admin: login público; todo lo demás exige sesión. Nada se cachea. */
export const adminRouter = Router();

adminRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
adminRouter.use(adminAuthRouter);
adminRouter.use(requireAdmin);
adminRouter.use(adminCatalogRouter);
adminRouter.use(adminOrdersRouter);
adminRouter.use(adminMetricsRouter);
