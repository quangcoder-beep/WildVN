const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const runtime = process.env.RECOVERY_RUNTIME;
const { chromium } = require(path.join(runtime, '../browser-tools/node_modules/playwright-core'));
const web = process.env.RECOVERY_WEB;
const api = process.env.RECOVERY_API;
const screenshots = path.join(runtime, 'screenshots');
const allowed = new Set([new URL(web).origin, new URL(api).origin]);
const token43 = 'Z'.repeat(43);
const results = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, message, timeout = 10000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (await check()) return; await sleep(50); }
  throw new Error(message);
}
(async () => {
  await fs.mkdir(screenshots, { recursive: true });
  const executablePath = process.env.RECOVERY_CHROMIUM || '/home/laivinhquang/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/*', route => allowed.has(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const postCounts = new Map();
  page.on('request', req => { if (req.method() === 'POST') postCounts.set(new URL(req.url()).pathname, (postCounts.get(new URL(req.url()).pathname) || 0) + 1); });
  async function check(name, run) {
    try { await run(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); }
    catch (error) { await page.screenshot({ path: path.join(screenshots, 'failure.png'), fullPage: true }); throw new Error(name + ': ' + error.message); }
  }
  try {
    await context.addCookies([{ name: 'wildvn-auth-token', value: process.env.RECOVERY_OLD_COOKIE, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    await check('real forgot request, one POST for duplicate submit, generic success', async () => {
      await page.goto(web + '/forgot-password');
      await page.evaluate(() => localStorage.setItem('wildvn-auth', JSON.stringify({state: {user: {id:'fixture',username:'fixture'},isLoggedIn:true},version:0})));
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(process.env.RECOVERY_EMAIL);
      await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
      await page.getByRole('heading', { name: 'Yêu cầu đã được tiếp nhận' }).waitFor();
      assert.equal(postCounts.get('/api/auth/forgot-password'), 1);
      assert.match(await page.textContent('body'), /Nếu tài khoản phù hợp tồn tại/);
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1');
      await page.screenshot({path:path.join(screenshots,'forgot-success.png'),fullPage:true});
    });
    let link;
    await check('real outbox worker sends reset link through trusted STARTTLS fixture', async () => {
      await waitFor(async () => { try {link=(await fs.readFile(process.env.RECOVERY_LINK_FILE,'utf8')).trim();return !!link;} catch {return false;} }, 'SMTP capture did not arrive', 30000);
      assert.equal(new URL(link).origin, web);
      assert.match(new URL(link).hash, /^#token=[A-Za-z0-9_-]{43}$/);
    });
    await check('real reset, fragment removal, cookies and persisted user cleared', async () => {
      await page.goto(link);
      await page.getByLabel('Mật khẩu mới', {exact:true}).waitFor();
      assert.equal(await page.evaluate(() => location.hash), '');
      await page.getByLabel('Mật khẩu mới', {exact:true}).fill('new-browser-fixture');
      await page.getByLabel('Xác nhận mật khẩu', {exact:true}).fill('new-browser-fixture');
      await page.getByRole('button', {name:'Cập nhật mật khẩu'}).click();
      await page.getByRole('heading', {name:'Đã cập nhật mật khẩu'}).waitFor();
      assert.equal((await context.cookies(api)).some(cookie => cookie.name === 'wildvn-auth-token' && cookie.value),false);
      const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('wildvn-auth')));
      assert.equal(persisted.state.user,null);assert.equal(persisted.state.isLoggedIn,false);
      assert.equal(await page.evaluate(() => document.activeElement.tagName),'H1');
      await page.screenshot({path:path.join(screenshots,'reset-success.png'),fullPage:true});
    });
    await check('old cookie and old password rejected, new password login works, token replay rejected', async () => {
      const oldCookie = await context.request.get(api + '/api/auth/me',{headers:{Cookie:'wildvn-auth-token='+process.env.RECOVERY_OLD_COOKIE}});
      assert.equal(oldCookie.status(),401);
      const old = await context.request.post(api+'/api/auth/login',{data:{username:process.env.RECOVERY_USERNAME,password:'old-browser-fixture'}});
      assert.equal(old.status(),401);
      const fresh = await context.request.post(api+'/api/auth/login',{data:{username:process.env.RECOVERY_USERNAME,password:'new-browser-fixture'}});
      assert.equal(fresh.status(),200);
      const used = await context.request.post(api+'/api/auth/reset-password',{data:{token:new URL(link).hash.slice(7),password:'third-browser-fixture'}});
      assert.equal(used.status(),400);
    });
    await check('invalid link and same-document new email fragment entry', async () => {
      await page.goto(web+'/reset-password');
      await page.getByRole('heading',{name:'Liên kết không hợp lệ'}).waitFor();
      await page.evaluate(token => {location.hash='token='+token;},token43);
      await page.getByLabel('Mật khẩu mới',{exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>location.hash),'');
    });
    await check('confirmation mismatch sends no API request; refresh requires email link again', async () => {
      const before=postCounts.get('/api/auth/reset-password');
      await page.getByLabel('Mật khẩu mới',{exact:true}).fill('valid-fixture-password');
      await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill('different-fixture-password');
      await page.getByRole('button',{name:'Cập nhật mật khẩu'}).click();
      await page.locator('p[role="alert"]').waitFor();
      assert.match(await page.locator('p[role="alert"]').textContent(),/không khớp/);
      assert.equal(postCounts.get('/api/auth/reset-password'),before);
      await page.reload();await page.getByRole('heading',{name:'Liên kết không hợp lệ'}).waitFor();
    });
    for (const [status, text] of [[429,/quá nhiều/],[503,/chưa khả dụng/],[500,/Không thể xử lý/]]) {
      await check('forgot UI safe error '+status, async () => {
        await page.route(api+'/api/auth/forgot-password',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({message:'synthetic-private-database-detail'})}));
        await page.goto(web+'/forgot-password');
        await page.getByRole('textbox',{name:'Email',exact:true}).fill('unknown@example.invalid');
        await page.getByRole('button',{name:'Gửi yêu cầu'}).click();
        await page.locator('p[role="alert"]').waitFor();
        assert.match(await page.locator('p[role="alert"]').textContent(),text);
        assert.doesNotMatch(await page.textContent('body'),/synthetic-private/);
        await page.unroute(api+'/api/auth/forgot-password');
      });
    }
    await check('mobile UI invalid email validation without POST',async()=>{
      await page.setViewportSize({width:390,height:844});await page.goto(web+'/forgot-password');
      const before=postCounts.get('/api/auth/forgot-password');
      await page.getByRole('textbox',{name:'Email',exact:true}).fill('bad-email');
      await page.getByRole('button',{name:'Gửi yêu cầu'}).click();
      await page.locator('p[role="alert"]').waitFor();assert.equal(postCounts.get('/api/auth/forgot-password'),before);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'recovery-error');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(screenshots,'mobile-validation.png'),fullPage:true});
    });
    await check('successful reset survives localStorage persistence failure',async()=>{
      await page.route(api+'/api/auth/reset-password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,message:'updated'})}));
      await page.goto(web+'/reset-password#token='+token43);await page.getByLabel('Mật khẩu mới',{exact:true}).waitFor();
      await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='wildvn-auth')throw new DOMException('synthetic-full-storage','QuotaExceededError');return original.call(this,key,value);};});
      await page.getByLabel('Mật khẩu mới',{exact:true}).fill('valid-fixture-password');
      await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill('valid-fixture-password');
      await page.getByRole('button',{name:'Cập nhật mật khẩu'}).click();
      await page.getByRole('heading',{name:'Đã cập nhật mật khẩu'}).waitFor();
      assert.doesNotMatch(await page.textContent('body'),/synthetic-full-storage/);
    });
    assert.deepEqual(pageErrors,[]);
    await fs.writeFile(path.join(runtime,'browser-summary.json'),JSON.stringify({cases:results,errors:pageErrors},null,2));
  } finally {await context.close();await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
