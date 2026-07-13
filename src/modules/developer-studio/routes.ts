import devStudioController from './controllers/devStudioController';
import backupController from './controllers/backupController';
import templateController from './controllers/templateController';
import pluginController from './controllers/pluginController';
import impersonationController from './controllers/impersonationController';
import ownerOnlyMiddleware from '../../middleware/ownerOnly';

// Route descriptors — designed as a minimal, framework-agnostic structure.
// Host application can adapt these into Express/Koa/Fastify routes during bootstrap.
export const devStudioRoutes: any[] = [
  {
    method: 'get',
    path: '/api/dev-studio/status',
    middlewares: [ownerOnlyMiddleware],
    handler: devStudioController.getDevStudioStatus,
  },
  {
    method: 'post',
    path: '/api/dev-studio/backups',
    middlewares: [ownerOnlyMiddleware],
    handler: backupController.createBackup,
  },
  {
    method: 'get',
    path: '/api/dev-studio/templates',
    middlewares: [ownerOnlyMiddleware],
    handler: templateController.listTemplates,
  },
  {
    method: 'get',
    path: '/api/dev-studio/plugins',
    middlewares: [ownerOnlyMiddleware],
    handler: pluginController.listPlugins,
  },
  {
    method: 'post',
    path: '/api/dev-studio/impersonate',
    middlewares: [ownerOnlyMiddleware],
    handler: impersonationController.startImpersonation,
  },
];

export default devStudioRoutes;
