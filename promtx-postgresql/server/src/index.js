import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cleanExpiredOAuthStates } from './services/oauthCleanup';
import { handleGoogleAuth, handleGoogleCallback, handleAppleAuth, handleAppleCallback, handleAppleRevoke, handleMicrosoftAuth, handleMicrosoftCallback, handleOAuthInit, handleOAuthCallback, handleAccountLink, handleAccountUnlink, handleListProviders, handleAuthVerifyMfa, handleAuthSetup2fa, handleAuthReferralCode, handleAuthApiKeys, handleAuthVerifyToken, handleAuthLogout, handleAuthAvatar, handleAuthForgotPassword, handleAuthResetPassword } from './routes/auth';
import { handleLlmGenerate, handleLlmGenerateParallel, handleLlmStream, handleLlmAbort, handleLlmUsageHistory, handleLlmUsageSummary } from './routes/llm';
import { handleBillingWallet, handleBillingTopup, handleBillingPaymentIntent, handleBillingWebhooks, handleBillingLedger, handlePromoCodeValidate, handleIapVerify, handleReceiptDownload, handleBillingSubscriptionManage, handleBillingSubscriptionCheckout, handleBillingSubscriptionStatus, handleBillingSubscriptionChange } from './routes/billing';
import { handleAdminUsers, handleAdminFreezeUser, handleAdminUpdateCredits, handleAdminLogs, handleAdminImpersonate } from './routes/admin';
import { handleDnaSave, handleDnaQuery } from './routes/dna';
import { handlePromptHistorySave, handlePromptHistoryQuery, handlePromptTemplateSave, handlePromptTemplateQuery, handlePromptTemplateDelete } from './routes/prompts';
import { handleImageGenerate, handleImageVariation, handleImageOutpaint, handleImageGallery, handleImagePublic, handleImageUpdatePublic, handleImageShare, handleImageUpscale } from './routes/images';
import { handleWorkspaceCreate, handleWorkspaceList, handleWorkspaceInvite, handleWorkspaceRemoveMember } from './routes/workspaces';
import { handleHealthCheck, handleMetrics, handleEventsLog, handleFeedback } from './routes/system';
const app = new Hono();
// Start cleanup cron (runs every 5 minutes)
setInterval(cleanExpiredOAuthStates, 5 * 60 * 1000);
app.use('/api/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));
app.get('/api/auth/google', async (c) => {
    const res = await handleGoogleAuth(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/auth/google/callback', async (c) => {
    const res = await handleGoogleCallback(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/auth/apple', async (c) => {
    const res = await handleAppleAuth(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/apple/callback', async (c) => {
    const res = await handleAppleCallback(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/apple/revoke', async (c) => {
    const res = await handleAppleRevoke(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/auth/microsoft', async (c) => {
    const res = await handleMicrosoftAuth(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/auth/microsoft/callback', async (c) => {
    const res = await handleMicrosoftCallback(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/auth/providers', async (c) => {
    const res = await handleListProviders(c.req.raw, 'mock-user-id', new Headers());
    return new Response(res.body, res);
});
app.get('/api/auth/:provider', async (c) => {
    const provider = c.req.param('provider');
    const res = await handleOAuthInit(c.req.raw, provider, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/:provider/callback', async (c) => {
    const provider = c.req.param('provider');
    const res = await handleOAuthCallback(c.req.raw, provider, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/link/:provider', async (c) => {
    const provider = c.req.param('provider');
    const res = await handleAccountLink(c.req.raw, provider, 'mock-user-id', new Headers());
    return new Response(res.body, res);
});
app.delete('/api/auth/link/:provider', async (c) => {
    const provider = c.req.param('provider');
    const res = await handleAccountUnlink(c.req.raw, provider, 'mock-user-id', new Headers());
    return new Response(res.body, res);
});
app.post('/api/llm/generate', async (c) => {
    const res = await handleLlmGenerate(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/llm/generate-parallel', async (c) => {
    const res = await handleLlmGenerateParallel(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/llm/stream', async (c) => {
    const res = await handleLlmStream(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/llm/abort', async (c) => {
    const res = await handleLlmAbort(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/llm/usage/history', async (c) => {
    const res = await handleLlmUsageHistory(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/llm/usage/summary', async (c) => {
    const res = await handleLlmUsageSummary(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/verify-mfa', async (c) => {
    const res = await handleAuthVerifyMfa(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/setup-2fa', async (c) => {
    const res = await handleAuthSetup2fa(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/auth/referral-code', async (c) => {
    const res = await handleAuthReferralCode(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/api-keys', async (c) => {
    const res = await handleAuthApiKeys(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/verify-token', async (c) => {
    const res = await handleAuthVerifyToken(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/logout', async (c) => {
    const res = await handleAuthLogout(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.put('/api/auth/avatar', async (c) => {
    const res = await handleAuthAvatar(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/forgot-password', async (c) => {
    const res = await handleAuthForgotPassword(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/auth/reset-password', async (c) => {
    const res = await handleAuthResetPassword(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/billing/wallet', async (c) => {
    const res = await handleBillingWallet(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/billing/topup', async (c) => {
    const res = await handleBillingTopup(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/billing/subscription/manage', async (c) => {
    const res = await handleBillingSubscriptionManage(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/billing/subscription/checkout', async (c) => {
    const res = await handleBillingSubscriptionCheckout(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/billing/subscription/status', async (c) => {
    const res = await handleBillingSubscriptionStatus(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/billing/subscription/change', async (c) => {
    const res = await handleBillingSubscriptionChange(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/billing/payment-intent', async (c) => {
    const res = await handleBillingPaymentIntent(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/webhooks/stripe', async (c) => {
    const res = await handleBillingWebhooks(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/billing/ledger', async (c) => {
    const res = await handleBillingLedger(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/billing/promo-code/validate', async (c) => {
    const res = await handlePromoCodeValidate(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/billing/iap/verify', async (c) => {
    const res = await handleIapVerify(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/billing/receipts/:id/download', async (c) => {
    const res = await handleReceiptDownload(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/admin/users', async (c) => {
    const res = await handleAdminUsers(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.put('/api/admin/users/:id/freeze', async (c) => {
    const res = await handleAdminFreezeUser(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.put('/api/admin/users/:id/credits', async (c) => {
    const res = await handleAdminUpdateCredits(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/admin/logs', async (c) => {
    const res = await handleAdminLogs(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/admin/impersonate/:id', async (c) => {
    const res = await handleAdminImpersonate(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/dna', async (c) => {
    const res = await handleDnaSave(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/dna', async (c) => {
    const res = await handleDnaQuery(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/prompts/history', async (c) => {
    const res = await handlePromptHistorySave(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/prompts/history', async (c) => {
    const res = await handlePromptHistoryQuery(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/prompts/templates', async (c) => {
    const res = await handlePromptTemplateSave(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/prompts/templates', async (c) => {
    const res = await handlePromptTemplateQuery(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.delete('/api/prompts/templates/:id', async (c) => {
    const res = await handlePromptTemplateDelete(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/images/generate', async (c) => {
    const res = await handleImageGenerate(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/images/:id/variation', async (c) => {
    const res = await handleImageVariation(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/images/:id/outpaint', async (c) => {
    const res = await handleImageOutpaint(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/images/gallery', async (c) => {
    const res = await handleImageGallery(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/images/public', async (c) => {
    const res = await handleImagePublic(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.put('/api/images/:id/public', async (c) => {
    const res = await handleImageUpdatePublic(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/images/:id/share', async (c) => {
    const res = await handleImageShare(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/images/:id/upscale', async (c) => {
    const res = await handleImageUpscale(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/workspaces', async (c) => {
    const res = await handleWorkspaceCreate(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/workspaces', async (c) => {
    const res = await handleWorkspaceList(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/workspaces/:id/invite', async (c) => {
    const res = await handleWorkspaceInvite(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.delete('/api/workspaces/:id/members/:userId', async (c) => {
    const res = await handleWorkspaceRemoveMember(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/health', async (c) => {
    const res = await handleHealthCheck(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.get('/api/metrics', async (c) => {
    const res = await handleMetrics(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/events/log', async (c) => {
    const res = await handleEventsLog(c.req.raw, new Headers());
    return new Response(res.body, res);
});
app.post('/api/feedback', async (c) => {
    const res = await handleFeedback(c.req.raw, new Headers());
    return new Response(res.body, res);
});
export default {
    port: 3001,
    fetch: app.fetch,
};
console.log(`[Promtx API] Server started on http://localhost:3001 via Hono`);
