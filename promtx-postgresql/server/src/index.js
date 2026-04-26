import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cleanExpiredOAuthStates } from './services/oauthCleanup';
import { handleGoogleAuth, handleGoogleCallback, handleAppleAuth, handleAppleCallback, handleAppleRevoke, handleMicrosoftAuth, handleMicrosoftCallback, handleOAuthInit, handleOAuthCallback, handleAccountLink, handleAccountUnlink, handleListProviders, handleAuthVerifyMfa, handleAuthSetup2fa, handleAuthReferralCode, handleAuthApiKeys, handleAuthVerifyToken, handleAuthLogout, handleAuthAvatar, handleAuthForgotPassword, handleAuthResetPassword } from './routes/auth';
import { handleLlmGenerate, handleLlmGenerateParallel, handleLlmStream, handleLlmAbort, handleLlmUsageHistory, handleLlmUsageSummary } from './routes/llm';
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
export default {
    port: 3001,
    fetch: app.fetch,
};
console.log(`[Promtx API] Server started on http://localhost:3001 via Hono`);
