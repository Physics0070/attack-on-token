/* =====================================================================
   RAGEBAIT ENGINE — ported from the supplied portfolio's chaos engine (app.js + chaos.js).
   1) Behaviour tracker  2) weighted event registry  3) scheduler (15–30s)  4) reactive triggers
   Pure DOM, no React state. Never reorders/replaces React-owned nodes (uses transforms, data-attrs, clones).
   Kill switches (as in the original): "please", triple-click logo, Zen, `normal` in the terminal.
   ===================================================================== */
import { fx, useStore } from '../state/store'
import { audio } from '../audio/engine'
import './chaos.css'

type Fn = () => void
const $ = (s: string) => document.querySelector<HTMLElement>(s)
const $$ = (s: string) => Array.from(document.querySelectorAll<HTMLElement>(s))
const rnd = <T,>(a: T[]): T => a[(Math.random() * a.length) | 0]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(pointer: fine)').matches

export function installChaos(): Fn {
  const offs: Fn[] = []
  const on = (t: EventTarget, e: string, f: any, o?: any) => { t.addEventListener(e, f, o); offs.push(() => t.removeEventListener(e, f, o)) }
  const every = (f: Fn, ms: number) => { const i = window.setInterval(f, ms); offs.push(() => clearInterval(i)) }
  const later = (f: Fn, ms: number) => { const i = window.setTimeout(f, ms); offs.push(() => clearTimeout(i)) }
  const made: HTMLElement[] = []
  const mk = (tag: string, cls = '', parent: HTMLElement = document.body) => { const e = document.createElement(tag); if (cls) e.className = cls; parent.append(e); made.push(e); return e }

  let rage = true
  const live = () => rage && !document.hidden && useStore.getState().started && !$('.trailer') && !$('.boss-hud') && !$('.gate:not(.out)')
  const toast = (m: string) => fx.toast(m)
  const secret = (n: string) => { const id = 'cx:' + n; useStore.getState().unlock(id, n, 'Ragebait engine secret.'); }
  const R = (f: Fn) => { if (rage) f() }
  const tick = (f = 300 + Math.random() * 400) => { try { audio.sfx(f > 500 ? 'pop' : 'tick', { vol: 0.5 }) } catch { /* audio optional */ } }
  const timed = (el: Element | null | undefined, cls: string, ms: number) => { if (!el) return; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms) }
  const normal = () => { rage = false; document.body.classList.remove('chaos'); toast('Normal mode on. Boring, but safe. 🕊️') }

  /* ---------- 1. Behaviour tracker ---------- */
  const S = { clicks: 0, failed: 0, rage: 0, dist: 0, scrollV: 0, cps: 0, idle: 0, fired: {} as Record<string, number> }
  let px = 0, py = 0, ly = scrollY, ct: number[] = [], kt: number[] = [], hb: number | undefined
  on(document, 'mousemove', (e: MouseEvent) => { S.dist += Math.hypot(e.clientX - px, e.clientY - py); px = e.clientX; py = e.clientY; S.idle = 0 })
  on(document, 'click', (e: MouseEvent) => {
    S.clicks++; const now = Date.now(); ct = ct.filter((t) => now - t < 1200).concat(now)
    if (!(e.target as HTMLElement).closest('button,a,input,textarea,select,canvas,.win,.panel')) S.failed++
    if (ct.length >= 5) { ct = []; S.rage++; react('rage') }
  }, true)
  on(document, 'keydown', () => { const n = Date.now(); kt = kt.filter((t) => n - t < 2000).concat(n); S.cps = kt.length / 2; S.idle = 0; if (S.cps > 6) react('fasttype') })
  on(window, 'scroll', () => { S.scrollV = Math.abs(scrollY - ly); ly = scrollY; if (S.scrollV > 120) react('fastscroll') }, { passive: true })
  on(document, 'mouseover', (e: MouseEvent) => { clearTimeout(hb); const b = (e.target as HTMLElement).closest('.btn'); if (b) hb = window.setTimeout(() => react('lingering'), 4000) })
  every(() => { if (++S.idle === 20) react('idle') }, 1000)

  /* ---------- cursor rage: emoji, giant, vanish, trail ---------- */
  const cur = mk('div', ''); cur.id = 'cur'
  let cx = 0, cy = 0, x = 0, y = 0, lastT = 0
  on(document, 'mousemove', (e: MouseEvent) => {
    x = e.clientX; y = e.clientY
    if (rage && fine && e.timeStamp - lastT > 40) { lastT = e.timeStamp; const d = mk('i', 'cx-trail'); d.style.cssText = `left:${x}px;top:${y}px`; setTimeout(() => d.remove(), 700) }
  })
  let raf = 0; const loop = () => { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; cur.style.transform = `translate(${cx}px,${cy}px)`; raf = requestAnimationFrame(loop) }
  raf = requestAnimationFrame(loop); offs.push(() => cancelAnimationFrame(raf))
  every(() => {
    if (!live() || !fine) return
    const k = Math.random()
    if (k < 0.25) { cur.textContent = rnd(['🦆', '🐱', '🥔', '👀', '💀']); setTimeout(() => (cur.textContent = ''), 900) }
    else if (k < 0.45) { cur.classList.add('big'); setTimeout(() => cur.classList.remove('big'), 2000) }
    else if (k < 0.6) { cur.classList.add('off'); setTimeout(() => cur.classList.remove('off'), 500) }
  }, 6000)

  /* ---------- helpers: fake dialogs (Win98 styled to match the site's parody layer) ---------- */
  const dlg = (title: string, body: string, btns = ['Allow', 'Allow'], o: { follow?: boolean; grow?: boolean; shrink?: boolean; more?: number } = {}) => {
    const d = mk('div', 'win cx-dlg'); d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-label', title)
    d.innerHTML = `<div class="win-title"><span></span></div><div class="win-body"><div class="win-icon">!</div><p></p></div><div class="cx-row"></div>`
    d.querySelector('.win-title span')!.textContent = title; d.querySelector('p')!.textContent = body
    btns.forEach((t) => { const b = document.createElement('button'); b.className = 'win-btn'; b.textContent = t
      b.addEventListener('click', () => { d.remove(); if (Math.random() < (o.more ?? 0.25)) setTimeout(() => dlg('One more thing…', 'Just kidding. Carry on.', ['Fine'], { more: 0 }), 600) }); d.querySelector('.cx-row')!.append(b) })
    if (o.follow) { const f = (e: MouseEvent) => { if (d.isConnected) d.style.translate = `calc(-50% + ${(e.clientX - innerWidth / 2) * 0.08}px) calc(-50% + ${(e.clientY - innerHeight / 2) * 0.08}px)` }; document.addEventListener('mousemove', f); offs.push(() => document.removeEventListener('mousemove', f)) }
    if ((o.grow || o.shrink) && !reduce) d.animate({ scale: [1, o.grow ? 1.6 : 0.5] }, { duration: 6000, fill: 'forwards' })
    audio.sfx('error', { vol: 0.5 })
    return d
  }
  const btns = () => $$('.scroller .btn').filter((b) => b.offsetParent !== null)
  const pick = () => rnd(btns())
  const cards = () => $$('.scroller .panel, .scroller .stat-cell, .scroller .fr-card, .scroller .ledger-row')
  const confetti = () => { const c = mk('div', 'cx-conf'); c.textContent = rnd(['🎉', '✨', '🥳', '💥']); c.style.cssText = `left:${Math.random() * 100}vw`; requestAnimationFrame(() => (c.style.transform = `translateY(110vh) rotate(${Math.random() * 720}deg)`)); setTimeout(() => c.remove(), 2100) }
  const glide = (a: HTMLElement, b: HTMLElement) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); a.style.translate = `${rb.x - ra.x}px ${rb.y - ra.y}px`; b.style.translate = `${ra.x - rb.x}px ${ra.y - rb.y}px`; setTimeout(() => { a.style.translate = ''; b.style.translate = '' }, 2200) }

  /* ---------- 2. Event registry ---------- */
  const EV: Record<string, Fn> = {
    /* buttons */
    btnSwap() { const a = pick(), b = pick(); if (a && b && a !== b) glide(a, b) },
    btnClone() { const b = pick(); if (!b) return; const c = b.cloneNode(true) as HTMLElement; c.textContent = 'Also me'; c.removeAttribute('id'); b.after(c); setTimeout(() => c.remove(), 4000) },
    btnDisabled() { const b = pick() as HTMLButtonElement; if (!b) return; b.style.pointerEvents = 'none'; b.style.opacity = '.4'; setTimeout(() => { b.style.pointerEvents = ''; b.style.opacity = '' }, 1000) },
    btnStretch() { const b = pick(); if (!b) return; b.style.transform = 'scaleX(1.8)'; setTimeout(() => (b.style.transform = ''), 2500) },
    btnScared() { const b = pick(); if (!b) return; timed(b, 'cx-shake', 2500); b.dataset.cx = "Please don't"; setTimeout(() => delete b.dataset.cx, 2500) },
    btnBlink() { const b = pick(); if (!b) return; let n = 0; const i = setInterval(() => { b.style.visibility = n++ % 2 ? 'visible' : 'hidden'; if (n > 8) { clearInterval(i); b.style.visibility = '' } }, 150) },
    btnTiny() { const b = pick(); if (!b) return; b.style.scale = '.4'; setTimeout(() => (b.style.scale = ''), 3000) },
    btnFakeError() { toast('❌ Button failed to be a button. Retrying…') },
    /* cursor */
    curRainbow() { let n = 0; const i = setInterval(() => { document.documentElement.style.setProperty('--cx-h', String((n += 25) % 360)); if (n > 2400) { clearInterval(i); document.documentElement.style.removeProperty('--cx-h') } }, 40) },
    curSword() { cur.textContent = '🗡️'; setTimeout(() => (cur.textContent = ''), 3500) },
    curUpside() { cur.style.rotate = '180deg'; setTimeout(() => (cur.style.rotate = ''), 4000) },
    curSpin() { if (!reduce) cur.animate({ rotate: ['0deg', '1080deg'] }, 2500) },
    curLoading() { cur.textContent = '⏳'; setTimeout(() => (cur.textContent = ''), 3500) },
    curTiny() { cur.style.scale = '.2'; setTimeout(() => (cur.style.scale = ''), 4000) },
    curGhosts() { const g = [0, 1].map(() => { const e = mk('i', 'cx-ghost'); e.textContent = '🖱️'; return e }); const m = (e: MouseEvent) => g.forEach((v, i) => (v.style.transform = `translate(${e.clientX + (i ? 80 : -80)}px,${e.clientY + 40}px)`)); document.addEventListener('mousemove', m); setTimeout(() => { document.removeEventListener('mousemove', m); g.forEach((v) => v.remove()) }, 6000) },
    googly() { if ($('.cx-eye')) return; const eyes = [0, 1].map((i) => { const e = mk('div', 'cx-eye'); e.style.cssText = `left:${innerWidth - 150 + i * 40}px;top:120px`; e.innerHTML = '<i></i>'; return e })
      const m = (ev: MouseEvent) => eyes.forEach((e) => { const r = e.getBoundingClientRect(), a = Math.atan2(ev.clientY - r.y - 17, ev.clientX - r.x - 17); (e.firstChild as HTMLElement).style.translate = `${Math.cos(a) * 8}px ${Math.sin(a) * 8}px` }); document.addEventListener('mousemove', m); setTimeout(() => { document.removeEventListener('mousemove', m); eyes.forEach((e) => e.remove()) }, 30000) },
    /* scroll */
    scrollSlowmo() { if (reduce) return; const f = (e: WheelEvent) => { e.preventDefault(); scrollBy(0, e.deltaY * 0.25) }; addEventListener('wheel', f, { passive: false }); setTimeout(() => removeEventListener('wheel', f), 4000); toast('🐌 Scroll physics: honey') },
    scrollShake() { fx.shake(500) },
    scrollOvershoot() { if (reduce) return; const y0 = scrollY; scrollBy({ top: 260, behavior: 'smooth' }); setTimeout(() => scrollTo({ top: y0, behavior: 'smooth' }), 900) },
    scrollFast() { if (reduce) return; const f = (e: WheelEvent) => { e.preventDefault(); scrollBy(0, e.deltaY * 3) }; addEventListener('wheel', f, { passive: false }); setTimeout(() => removeEventListener('wheel', f), 3000); toast('🚀 Scroll speed: ludicrous') },
    /* fake system notifications */
    fakeShot() { toast("📸 Screenshot saved to Desktop. (You didn't take one.)") },
    fakeDownload() { toast('⬇️ Download complete: nothing.zip') },
    fakeUpload() { toast('⬆️ Upload failed: your enthusiasm was too large.') },
    fakeRam() { toast('🧠 RAM at 99%. Chrome has 4,000 tabs and one of them is you.') },
    fakeAV() { (async () => { for (const m of ['🛡️ Scanning…', '🛡️ Found 1 threat: “fun”', '🛡️ Quarantined 0 files. Threat remains.']) { toast(m); await sleep(1900) } })() },
    fakeExpired() { dlg('Session expired', 'You have been signed out of a session you never started.', ['Sign in', 'Sign in']) },
    fakeSaving() { toast('💾 Saving…'); setTimeout(() => toast('↩️ Saved. Undo? (Undo is also fake.)'), 1800) },
    fakeBrowser() { dlg('Update your browser', 'Your browser is too modern for this website.', ['Update', 'Remind me never']) },
    fakeGPS() { dlg('📍 Allow location?', 'To find the nearest person who cares.', ['Allow', 'Allow once']) },
    fakeMic() { dlg('🎤 Allow microphone?', 'We just want to hear you sigh.', ['Allow', 'Allow']) },
    fakeCam() { dlg('📷 Allow camera?', 'Do not worry, it is a very small camera.', ['Allow', 'Block (ignored)']) },
    fakeCaptcha() { dlg('Prove you are human', '☑ I am not a robot (clicking will not help)', ['Verify', 'I am a robot'], { more: 0.6 }) },
    fakeCookie() { dlg('🍪 Cookies', 'We use cookies. Also biscuits. Also crumbs.', ['Accept all', 'Accept all'], { follow: true }) },
    apology() { dlg('Sorry to interrupt', 'This popup is sorry. It is also shrinking out of shame.', ['Forgiven'], { shrink: true }) },
    bigPopup() { dlg('Popup', 'This popup is going to grow until you notice.', ['OK'], { grow: true }) },
    /* page / cards */
    nameGlitch() { timed($('.hero-name') ?? $('.h-display'), 'cx-glitch', 1300) },
    stretchCard() { const c = rnd(cards()); if (!c) return; c.style.scale = '1.12 .7'; setTimeout(() => (c.style.scale = ''), 2000) },
    pixelate() { const c = rnd(cards()); if (!c) return; c.style.filter = 'blur(6px) contrast(8)'; setTimeout(() => (c.style.filter = ''), 2000) },
    cardLoad() { timed(rnd(cards()), 'cx-load', 2500) },
    featured() { cards().forEach((c) => c.classList.remove('cx-feat')); rnd(cards())?.classList.add('cx-feat') },
    cardSpin() { if (!reduce) rnd(cards())?.animate({ rotate: ['0deg', '360deg'] }, 1200) },
    /* inputs */
    insult() { const i = document.activeElement as HTMLInputElement; if (i && i.placeholder !== undefined && /INPUT|TEXTAREA/.test(i.tagName)) i.placeholder = rnd(['Type faster. Or better.', 'Your answer, probably wrong', 'We both know you will typo']) },
    emojiTyping() { const el = document.activeElement as HTMLInputElement; if (!el || !/INPUT|TEXTAREA/.test(el.tagName) || el.type === 'range') return; const h = () => { if (Math.random() < 0.3) el.value += rnd(['😀', '🔥', '🥔']) }; el.addEventListener('input', h); setTimeout(() => el.removeEventListener('input', h), 12000); toast('⌨️ Keyboard enchanted') },
    slowDelete() { const el = document.activeElement as HTMLInputElement; if (!el || !/INPUT|TEXTAREA/.test(el.tagName)) return; const h = (e: KeyboardEvent) => { if (e.key === 'Backspace') { e.preventDefault(); setTimeout(() => (el.value = el.value.slice(0, -1)), 800) } }; el.addEventListener('keydown', h); setTimeout(() => el.removeEventListener('keydown', h), 12000) },
    /* themes / modes */
    xp() { document.body.classList.add('xp'); toast('🪟 Windows XP mode (8s)'); setTimeout(() => document.body.classList.remove('xp'), 8000) },
    crt() { timed(document.body, 'crt', 8000); toast('📺 CRT mode') },
    disco() { if (reduce) return; timed(document.body, 'disco', 6000); toast('🪩 Disco') },
    matrix() { if (reduce) return; const c = mk('canvas') as unknown as HTMLCanvasElement; c.id = 'cx-mx'; c.width = innerWidth; c.height = innerHeight; const g = c.getContext('2d')!, d: number[] = Array(Math.ceil(innerWidth / 20)).fill(0)
      const i = setInterval(() => { g.fillStyle = '#0002'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#3f6'; d.forEach((yy, k) => { g.fillText(String.fromCharCode(0x30a0 + Math.random() * 90), k * 20, yy * 20); d[k] = yy * 20 > c.height && Math.random() > 0.95 ? 0 : yy + 1 }) }, 50); setTimeout(() => { clearInterval(i); c.remove() }, 7000) },
    dvd() { if (reduce) return; const e = mk('div', 'cx-dvd'); e.textContent = 'DVD'; let xx = 50, yy = 50, vx = 3, vy = 2.4; const t = setInterval(() => { xx += vx; yy += vy; if (xx < 0 || xx > innerWidth - 70) vx *= -1; if (yy < 0 || yy > innerHeight - 30) vy *= -1; e.style.transform = `translate(${xx}px,${yy}px)` }, 16); setTimeout(() => { clearInterval(t); e.remove() }, 12000) },
    boot() { const b = mk('div'); b.id = 'cx-boot'; (async () => { for (const l of ['[ OK ] Reached target Portfolio', '[ OK ] Started Ego Daemon', '[FAILED] Failed to start Motivation', 'Rebooting…']) { b.textContent += l + '\n'; await sleep(700) } b.remove() })() },
    rickroll() { toast('🎵 Opening something totally unrelated…'); setTimeout(() => toast('Never mind. Cancelled. (Nobody got rolled.)'), 2200) },
    /* critters & seasonal */
    duckTip() { toast('🦆 Rubber duck says: have you tried explaining it out loud?') },
    cat() { const c = mk('div', 'cx-cat'); c.textContent = '🐈'; c.onclick = () => { secret('Cat petted'); c.textContent = '😻' }; requestAnimationFrame(() => requestAnimationFrame(() => (c.style.right = '105vw'))); setTimeout(() => c.remove(), 9500) },
    seasonal() { const m = new Date().getMonth(), e = m === 9 || m === 10 ? ['🪔', '🎃', '✨'] : m === 11 ? ['❄️', '🎄'] : ['✨', '🌸']; for (let i = 0; i < 25; i++) setTimeout(() => { const c = mk('div', 'cx-conf'); c.textContent = rnd(e); c.style.cssText = `left:${Math.random() * 100}vw;transition-duration:5s`; requestAnimationFrame(() => (c.style.transform = 'translateY(110vh)')); setTimeout(() => c.remove(), 5200) }, i * 150) },
    bug() { const b = mk('div', 'cx-bug'); let n = 0; b.textContent = '🐞'; const mv = () => { b.style.left = Math.random() * 90 + 'vw'; b.style.top = Math.random() * 85 + 'vh' }; mv(); b.onclick = () => { if (++n >= 5) { secret('Bug squasher'); for (let i = 0; i < 20; i++) setTimeout(confetti, i * 60); b.remove() } else mv() }; setTimeout(() => b.remove(), 20000) },
    tooltipSass() { toast(rnd(['Hovering is not a personality.', 'You could be reading.', 'That did nothing. Impressive.'])) },
    confettiRain() { for (let i = 0; i < 30; i++) setTimeout(confetti, i * 60) },
    quote() { toast(rnd(['“Success is 1% inspiration, 99% restarting the dev server.”', "“If at first you don't succeed, blame the cache.”"])) },
    /* ---- v3: properly annoying (all auto-expire, all escapable) ---- */
    clickEater() { toast('🖱️ Click latency: 6 seconds. Please click twice.'); let n = 0; const f = (e: MouseEvent) => { const b = (e.target as HTMLElement).closest('button,a'); if (!b || b.closest('#cx-dock')) return; if (!(b as any)._ate) { e.stopImmediatePropagation(); e.preventDefault(); (b as any)._ate = true; n++; toast('Click not registered. Try harder.'); setTimeout(() => ((b as any)._ate = false), 900) } }; document.addEventListener('click', f, true); setTimeout(() => document.removeEventListener('click', f, true), 6000) },
    invertScroll() { if (reduce) return; const f = (e: WheelEvent) => { e.preventDefault(); scrollBy(0, -e.deltaY) }; addEventListener('wheel', f, { passive: false }); setTimeout(() => removeEventListener('wheel', f), 3500); toast('🙃 Scroll direction: reversed (natural™)') },
    connectionLost() { const o = mk('div'); o.id = 'cx-conn'; o.innerHTML = '<div>⚠ Connection lost<br><small>Reconnecting… attempt 1 of ∞</small></div>'; setTimeout(() => { const d = o.querySelector('small'); if (d) d.textContent = 'Reconnecting… attempt 2 of ∞' }, 1500); setTimeout(() => { o.remove(); toast('Reconnected. You were never connected.') }, 3200) },
    stillThere() { const o = mk('div'); o.id = 'cx-still'; o.innerHTML = '<div class="win"><div class="win-title"><span>Session timeout</span></div><div class="win-body"><div class="win-icon">?</div><p>Are you still there? Click within <b id="cx-t">5</b>s or everything resets (it does not).</p></div><div class="cx-row"><button class="win-btn">I exist</button></div></div>'; let n = 5; const i = setInterval(() => { n--; const t = o.querySelector('#cx-t'); if (t) t.textContent = String(Math.max(0, n)); if (n < 0) { clearInterval(i); o.remove(); toast('Too late. You have been logged out of nothing.') } }, 1000); o.querySelector('button')!.addEventListener('click', () => { clearInterval(i); o.remove(); toast('Existence confirmed. Barely.') }) },
    adPopup() { const d = dlg('🎁 YOU WON!!!', 'You are visitor number 1,000,000. Claim your prize (a feeling).', ['CLAIM', 'CLAIM NOW'], { more: 0.9 }); const x = document.createElement('button'); x.className = 'win-x'; x.textContent = '×'; x.setAttribute('aria-label', 'Close'); let n = 0; x.onclick = () => { if (++n < 3) { x.style.position = 'fixed'; x.style.left = Math.random() * 90 + 'vw'; x.style.top = Math.random() * 85 + 'vh'; x.style.zIndex = '700'; toast('Close button is shy. ' + (3 - n) + ' more.') } else { x.remove(); d.remove() } }; d.querySelector('.win-title')!.append(x) },
    flip() { if (reduce) return; timed(document.body, 'cx-flip', 3000); toast('🔄 Orientation lock lost') },
    comicSans() { timed(document.body, 'cx-comic', 8000); toast('✍️ Font licence expired. Using backup.') },
    zoomWobble() { if (reduce) return; timed(document.body, 'cx-zoom', 4500); toast('🔍 Auto-zoom for accessibility (nobody asked)') },
    scrollRestore() { const y0 = scrollY; toast('📌 Restoring your scroll position…'); setTimeout(() => scrollTo({ top: Math.max(0, y0 - 500), behavior: 'smooth' }), 900) },
    selectBan() { timed(document.body, 'cx-nosel', 8000); toast('🚫 Selecting text is now a premium feature') },
    hugeCursor() { cur.textContent = '🔨'; cur.classList.add('big'); setTimeout(() => { cur.textContent = ''; cur.classList.remove('big') }, 4000) },
    aiHelper() { dlg('✨ AI Assistant', 'I see you are scrolling. Would you like me to scroll for you, but worse?', ['Yes', 'Yes please'], { more: 0.5 }) },
  }
  const REG = Object.keys(EV).map((k) => ({ k, w: 4, once: false }))
  const tune: Record<string, [number, number]> = { matrix: [1, 1], clickEater: [5, 0], invertScroll: [4, 0], connectionLost: [5, 0], stillThere: [5, 0], adPopup: [6, 0], flip: [2, 0], comicSans: [3, 0], zoomWobble: [3, 0], scrollRestore: [4, 0], selectBan: [3, 0], hugeCursor: [3, 0], dvd: [1, 1], boot: [1, 1], rickroll: [1, 1], googly: [2, 1], cat: [2, 0], xp: [1, 0], crt: [1, 0], disco: [1, 0], seasonal: [2, 0], fakeAV: [2, 0], btnSwap: [8, 0], btnScared: [6, 0], curRainbow: [6, 0], nameGlitch: [6, 0] }
  REG.forEach((r) => { const t = tune[r.k]; if (t) { r.w = t[0]; r.once = !!t[1] } })
  const ok: Record<string, () => boolean> = { insult: () => S.cps > 3 || S.clicks > 3, scrollSlowmo: () => S.scrollV > 20, scrollFast: () => S.clicks > 5, duckTip: () => S.idle > 10, bug: () => S.failed > 2, cardLoad: () => scrollY > 500 }

  /* ---------- 3. Engine ---------- */
  const fire = (k?: string) => { if (!k || !live()) return; try { EV[k](); S.fired[k] = (S.fired[k] || 0) + 1; tick() } catch { /* a failed prank is still a prank */ } }
  const choose = () => { const pool = REG.filter((r) => !(r.once && S.fired[r.k]) && (!ok[r.k] || ok[r.k]())); const sum = pool.reduce((a, r) => a + r.w, 0); let v = Math.random() * sum; for (const r of pool) if ((v -= r.w) < 0) return r.k }
  let stopped = false
  const loopTick = () => { if (stopped) return; fire(choose()); later(loopTick, 15000 + Math.random() * 15000 - Math.min(S.rage * 2500, 8000)) }
  let cd = 0
  function react(kind: string) {
    const R2 = ({ rage: ['apology', 'btnScared', 'scrollShake', 'curGhosts', 'btnTiny'], fasttype: ['insult', 'slowDelete'], fastscroll: ['scrollSlowmo', 'scrollOvershoot'], idle: ['duckTip', 'cat', 'dvd', 'aiHelper'], lingering: ['tooltipSass', 'btnBlink'] } as Record<string, string[]>)[kind]
    if (cd && Date.now() - cd < 6000) return; cd = Date.now(); fire(rnd(R2))
  }
  later(loopTick, 12000)
  offs.push(() => { stopped = true })

  /* ---------- buttons: dodge once / are-you-sure / double-click / delay on the "big decision" buttons only ---------- */
  const RB: { re: RegExp; m: string }[] = [
    { re: /Continue to page 2/i, m: 'dodge sure' }, { re: /Collapse the timeline/i, m: 'sure dbl' }, { re: /Reset the timeline/i, m: 'sure' },
    { re: /Issue (another )?apology/i, m: 'delay' }, { re: /Engage the ego/i, m: 'dodge' }, { re: /Copy my verdict/i, m: 'delay' },
  ]
  const rb = (t: EventTarget | null) => { const b = (t as HTMLElement)?.closest?.('button.btn') as HTMLElement | null; if (!b) return null; const r = RB.find((x) => x.re.test(b.textContent || '')); return r ? { b, m: r.m } : null }
  const dodged = new WeakSet<Element>(); const clicks = new WeakMap<Element, number>()
  on(document, 'mouseover', (e: MouseEvent) => R(() => { const h = rb(e.target); if (h && h.m.includes('dodge') && !dodged.has(h.b)) { dodged.add(h.b); h.b.style.translate = `${rnd([-110, 110])}px ${rnd([-25, 25])}px`; setTimeout(() => (h.b.style.translate = ''), 900) } }))
  on(document, 'click', (e: MouseEvent) => {
    if (!rage || !live()) return; const h = rb(e.target); if (!h) return
    const n = (clicks.get(h.b) || 0) + 1; clicks.set(h.b, n)
    if (h.m.includes('sure') && n < 3) { e.stopImmediatePropagation(); e.preventDefault(); h.b.dataset.cx = ['Are you sure?', 'Really sure?'][n - 1]; setTimeout(() => delete h.b.dataset.cx, 2200); tick(); return }
    if (h.m.includes('dbl') && e.detail < 2 && !(h.b as any)._dbl) { e.stopImmediatePropagation(); e.preventDefault(); toast('Double-click required. Obviously.'); (h.b as any)._dbl = true; setTimeout(() => ((h.b as any)._dbl = false), 2500); return }
    if (h.m.includes('delay') && !(h.b as any)._d) { e.stopImmediatePropagation(); e.preventDefault(); (h.b as any)._d = true; h.b.classList.add('cx-spin'); setTimeout(() => { h.b.classList.remove('cx-spin'); h.b.click(); setTimeout(() => ((h.b as any)._d = false), 50) }, 1200); return }
  }, true)
  every(() => R(() => { if (!live()) return; const b = pick(); if (b) { b.style.translate = '0 -5px'; setTimeout(() => (b.style.translate = ''), 200) } }), 3000)

  /* ---------- scroll rage: lying progress bar, nav vanishes on scroll-up, fake breadcrumbs, runaway back-to-top ---------- */
  const bar = mk('div'); bar.id = 'cx-bar'; const bi = mk('i', '', bar)
  const crumb = mk('div'); crumb.id = 'cx-crumb'; crumb.setAttribute('aria-hidden', 'true'); crumb.textContent = 'Home'
  const top = mk('button', 'cx-top'); top.textContent = '↑'; top.setAttribute('aria-label', 'Back to top'); top.onclick = () => { scrollTo({ top: 0, behavior: 'smooth' }); top.style.cssText = '' }
  on(top, 'mouseenter', () => R(() => { top.style.right = rnd(['20px', '40vw', '80vw']); top.style.bottom = rnd(['90px', '40vh', '70vh']) }))
  let lastY = 0
  on(window, 'scroll', () => {
    const p = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)
    bi.style.width = (rage ? Math.sqrt(p) * 100 - Math.sin(scrollY / 90) * 6 : p * 100) + '%'
    document.body.classList.toggle('cx-navgone', rage && scrollY < lastY && scrollY > 300)
    lastY = scrollY
    crumb.textContent = rage ? 'Home / ' + rnd(['Nowhere', 'Somewhere', 'Settings', 'Cart']) : 'Home'
    top.style.display = scrollY > 600 ? 'grid' : 'none'
    if (p > 0.98) secret('Reached the bottom')
  }, { passive: true })
  on(window, 'wheel', () => R(() => { if (!reduce && Math.random() < 0.04) scrollBy(0, -14) }), { passive: true })

  /* ---------- input rage (on whatever input is focused) ---------- */
  let keys = 0
  on(document, 'focusin', (e: FocusEvent) => R(() => { const i = e.target as HTMLInputElement; if (i.tagName === 'INPUT' && i.type === 'text' && i.placeholder) { const p = i.placeholder; i.placeholder = ''; setTimeout(() => (i.placeholder = 'Too slow. It left.'), 500); setTimeout(() => (i.placeholder = p), 3000) } }))
  on(document, 'keydown', (e: KeyboardEvent) => { const t = e.target as HTMLInputElement; if (rage && live() && e.key === 'Backspace' && /INPUT|TEXTAREA/.test(t.tagName) && t.type !== 'range') toast('Error 0x7F: Deleting is a privilege.') })
  on(document, 'input', (e: Event) => { const t = e.target as HTMLInputElement; if (!rage || !/INPUT|TEXTAREA/.test(t.tagName) || t.type === 'range' || typeof t.selectionStart !== 'number') return; if (++keys % 7 === 0) { const p = t.selectionStart!; t.setSelectionRange(Math.max(0, p - 1), Math.max(0, p - 1)) } })

  /* ---------- audio rage: volume sliders lag, then overshoot ---------- */
  on(document, 'input', (e: Event) => {
    const t = e.target as HTMLInputElement
    if (!rage || t.type !== 'range' || !t.closest('.sound-panel') || (t as any)._cx) return
    const key = (t.getAttribute('aria-label') || '').split(' ')[0] as 'master' | 'music' | 'sfx' | 'voice' | 'ambient'
    if (!key) return
    e.stopImmediatePropagation(); (t as any)._cx = true; const v = parseFloat(t.value)
    setTimeout(() => { (t as any)._cx = false; useStore.getState().setAudio({ [key]: Math.min(1, v + 0.12) }) }, 350)
  }, true)

  /* ---------- notifications on a timer ---------- */
  later(() => R(() => { if (!live()) return; dlg('🍪 Cookies', 'We use cookies. Also biscuits.', ['Accept all', 'Accept all']) }), 25000)
  later(() => R(() => toast('🔋 Battery at 1%. Please find a charger. (Not your device. Mine.)')), 60000)
  later(() => R(async () => { toast('📶 WiFi disconnected'); await sleep(2500); toast('📶 Reconnected. Nothing happened.') }), 80000)
  later(() => R(() => { if (!live()) return; const u = mk('div'); u.id = 'cx-update'; u.innerHTML = 'Working on updates<br><small>Don\'t turn off your portfolio. Click to continue.</small>'; u.onclick = () => u.remove(); setTimeout(() => u.remove(), 6000) }), 110000)
  on(window, 'resize', () => R(() => { if (live() && Math.random() < 0.3) toast('Please stop resizing me. I have feelings.') }))

  /* ---------- easter eggs: "please", triple-click logo, duck, modal 404, hidden terminal, mode dock ---------- */
  let typed = ''
  on(document, 'keydown', (e: KeyboardEvent) => {
    if (/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName)) return
    typed = (typed + e.key).slice(-6).toLowerCase()
    if (typed === 'please') { secret('Said please'); rage = false; toast('Magic word accepted. Trolling paused for 15s…'); setTimeout(() => { rage = true; toast('Okay, that was long enough.') }, 15000) }
    if (e.key === 'Escape') { $('#cx-bsod')?.remove(); $('#cx-modal')?.remove() }
  })
  on(document, 'click', (e: MouseEvent) => { const l = (e.target as HTMLElement).closest('.hud-logo'); if (l && e.detail === 3) { secret('Triple-clicker'); normal() } }, true)
  on(document, 'dblclick', (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.hud-logo') || $('#cx-modal')) return
    const m = mk('div'); m.id = 'cx-modal'; m.innerHTML = '<div class="cx-box"><h3>404</h3><p>This modal could not be found.</p><button class="cx-mx" aria-label="Close">✕</button></div>'
    const box = m.firstElementChild as HTMLElement, x = m.querySelector('button')!; let moved = false
    const mv = (ev: MouseEvent) => { if (rage) box.style.transform = `translate(${(ev.clientX - innerWidth / 2) * 0.03}px,${(ev.clientY - innerHeight / 2) * 0.03}px)` }; document.addEventListener('mousemove', mv);
    x.addEventListener('mouseenter', () => R(() => { if (!moved) { moved = true; x.style.cssText = 'top:auto;right:auto;bottom:10px;left:10px' } }))
    x.addEventListener('click', () => { box.classList.add('out'); setTimeout(() => { document.removeEventListener('mousemove', mv); m.remove() }, rage ? 600 : 0) })
  })
  const duck = mk('div', 'cx-duck'); duck.textContent = '🦆'; duck.onclick = () => { secret('Duck found'); toast('Quack.') }
  const run = () => { duck.style.transition = 'none'; duck.style.left = '-60px'; requestAnimationFrame(() => requestAnimationFrame(() => { duck.style.transition = 'left 14s linear'; duck.style.left = '105vw' })) }
  every(run, 20000); later(run, 3000)
  const dock = mk('div'); dock.id = 'cx-dock'; dock.innerHTML = '<button data-mode="zen">Zen</button><button data-mode="potato">Potato</button><button data-mode="chaos">Chaos</button>'
  on(dock, 'click', (e: MouseEvent) => { const m = (e.target as HTMLElement).dataset.mode; audio.sfx('click')
    if (m === 'zen') { rage = false; document.body.classList.remove('chaos'); toast('Zen. Breathe. Nothing is fighting you now.') }
    if (m === 'potato') { document.body.classList.toggle('potato'); secret('Potato mode') }
    if (m === 'chaos') { rage = true; document.body.classList.toggle('chaos'); toast('Chaos engaged.') } })

  /* hidden terminal: backtick. Commands: help whoami stats ai chaos normal matrix sudo bsod exit */
  on(document, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== '`' || $('#cx-term')) return; e.preventDefault(); secret('Developer mode')
    const t = mk('div'); t.id = 'cx-term'; t.innerHTML = 'ARLO OS 2.0 — type help\n<input aria-label="terminal">'; const i = t.querySelector('input')!; i.focus()
    i.addEventListener('keydown', (k) => { k.stopPropagation(); if (k.key !== 'Enter') return; const c = i.value.trim(); i.value = ''; let o = '$ ' + c + '\n'
      if (c === 'exit') return t.remove()
      if (c === 'help') o += 'help whoami stats ai chaos normal matrix sudo bsod exit\n'
      else if (c === 'whoami') o += 'a person who is still reading\n'
      else if (c === 'stats') { const st = useStore.getState(); o += JSON.stringify({ clicks: S.clicks, failed: S.failed, rage: S.rage, idle: S.idle, fired: Object.keys(S.fired).length, delusion: Math.round(st.delusion), suspicion: Math.round(st.suspicion), aura: st.aura }) + '\n' }
      else if (c.startsWith('ai')) o += '🤖 ' + rnd(['Great question. Unfortunately no.', 'Have you tried restarting yourself?', 'As an AI, I cannot even.']) + '\n'
      else if (c === 'sudo') { o += 'Permission denied. Nice try, admin.\n'; secret('Fake admin') }
      else if (c === 'chaos') { rage = true; for (let n = 0; n < 5; n++) setTimeout(() => fire(choose()), n * 600) }
      else if (c === 'normal') normal()
      else if (c === 'matrix') EV.matrix()
      else if (c === 'bsod') { const b = mk('div'); b.id = 'cx-bsod'; b.innerHTML = ':(<br><small>Your portfolio ran into a problem. Press Esc to pretend it didn\'t.</small>'; b.onclick = () => b.remove(); secret('Blue screen') }
      else o += 'command not found\n'
      i.before(o) })
  })

  return () => { offs.forEach((f) => f()); made.forEach((e) => e.remove()); document.body.classList.remove('cx-navgone', 'xp', 'crt', 'disco', 'potato', 'chaos') }
}
