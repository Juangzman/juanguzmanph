const { chromium } = require('playwright');
const O='/tmp/claude-0/vgc/';
const settle = async (p,h) => { const H = await p.evaluate(()=>document.body.scrollHeight); for (let y=0;y<H;y+=h*0.5){ await p.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y); await p.waitForTimeout(120);} await p.waitForTimeout(800); await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'})); await p.waitForTimeout(600); };
const limpio = `.wa-float,.mbar{display:none!important}.header{position:relative!important}#contacto{display:none!important}`;
(async () => {
  const b = await chromium.launch();
  // Escritorio
  let ctx = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 });
  let p = await ctx.newPage();
  await p.goto('http://localhost:8766/'); await p.waitForTimeout(1500); await settle(p,900);
  await p.screenshot({path:O+'d-hero.png'});
  await p.addStyleTag({content:limpio}); await p.waitForTimeout(400);
  for (const s of ['turnos']) { await p.locator('section.'+s).first().screenshot({path:O+`d-form.png`}); }
  await p.locator('footer.footer').screenshot({path:O+'d-footer.png'});
  await ctx.close();
  ctx = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:1 });
  p = await ctx.newPage(); await p.goto('http://localhost:8766/'); await p.waitForTimeout(1500); await settle(p,900);
  await p.addStyleTag({content:limpio}); await p.waitForTimeout(400);
  await p.screenshot({path:O+'d-full.png', fullPage:true});
  await ctx.close();
  // Celular
  ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3, isMobile:true, hasTouch:true });
  p = await ctx.newPage(); await p.goto('http://localhost:8766/'); await p.waitForTimeout(1500); await settle(p,844);
  await p.screenshot({path:O+'m-hero.png'});
  await ctx.close();
  ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  p = await ctx.newPage(); await p.goto('http://localhost:8766/'); await p.waitForTimeout(1500); await settle(p,844);
  await p.addStyleTag({content:limpio}); await p.waitForTimeout(400);
  await p.screenshot({path:O+'m-full.png', fullPage:true});
  // Sistemas internos (interfaz sin datos de clientes)
  const abrir = async (u) => { await p.goto('http://localhost:8766/'+u); await p.waitForTimeout(1000);
    await p.evaluate(()=>{ try{ window.enter && window.enter(); }catch(e){} document.querySelectorAll('#login,#vLogin').forEach(e=>e.hidden=true); document.querySelectorAll('#app,#vApp').forEach(e=>e.hidden=false);
      document.querySelectorAll('*').forEach(e=>{ if(e.children.length===0 && /Conectando/.test(e.textContent)) e.style.visibility='hidden'; }); });
    await p.waitForTimeout(1500); };
  await abrir('turnos/'); await p.screenshot({path:O+'m-turnos.png'});
  await ctx.close();
  ctx = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 });
  p = await ctx.newPage();
  await abrir('turnos/'); await p.screenshot({path:O+'d-turnos.png'});
  await abrir('panel/'); await p.screenshot({path:O+'d-panel.png'});
  await ctx.close(); await b.close();
})();
