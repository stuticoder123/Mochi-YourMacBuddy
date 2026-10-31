(() => {
  'use strict';

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mochi.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('mochi.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const toastEl = $('#toast');
  let toastTimer = null;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  };
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const go = (sel) => { const el = $(sel); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); };

  /* ---------- Nav: shrink on scroll + mobile menu ---------- */
  const navWrap = $('#navWrap');
  const onScroll = () => navWrap.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = $('#menuBtn');
  const navLinks = $('#navLinks');
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('a', navLinks).forEach((a) => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 80}ms`; io.observe(el); });

  /* ================= FEATURE 1: Eyes follow the cursor ================= */
  const heroMascot = $('#heroMascot');
  const eyes = [$('#eyeL'), $('#eyeR')];
  window.addEventListener('pointermove', (e) => {
    if (reduce || !heroMascot) return;
    const r = heroMascot.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.57; // eye line sits ~57% down the sprite
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const mag = Math.min(dist / (r.width * 1.5), 1) * 5; // max 5 sprite units of travel
    const tx = (dx / dist) * mag;
    const ty = (dy / dist) * mag;
    eyes.forEach((el) => { if (el) el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`; });
  }, { passive: true });

  /* ================= FEATURE 3: Click the mascot 5 times → confetti ================= */
  const cv = $('#confetti');
  const ctx = cv.getContext('2d');
  let parts = [];
  let raf = null;
  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.floor(window.innerWidth * dpr);
    cv.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const burst = (x, y) => {
    const colors = ['#9272CF', '#F6C6E2', '#C9B3EE', '#A9DDF0', '#F6A9CF', '#FFD9A8'];
    for (let i = 0; i < 120; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 4 + Math.random() * 8;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: 5 + Math.random() * 5,
        c: colors[i % colors.length], life: 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
    }
    if (!raf) loop();
  };
  const loop = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    parts.forEach((p) => {
      p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.life -= 0.012; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    });
    parts = parts.filter((p) => p.life > 0 && p.y < window.innerHeight + 20);
    raf = parts.length ? requestAnimationFrame(loop) : null;
    if (!parts.length) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };

  let tapCount = 0;
  let tapTimer = null;
  heroMascot.addEventListener('click', () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 2000);
    if (tapCount >= 5) {
      tapCount = 0;
      const r = heroMascot.getBoundingClientRect();
      if (!reduce) burst(r.left + r.width / 2, r.top + r.height / 2);
      toast('Mochi is so happy right now ✦');
    }
  });

  /* ================= FEATURE 2: Mood-driven page tint ================= */
  const TINTS = {
    Calm:    { bg: '#F3F8F6', lav: '#E6F3EE', hero: '#EEF7F3' },
    Focused: { bg: '#F5F7FC', lav: '#E8EDF9', hero: '#EDF1FB' },
    Happy:   { bg: '#FFF9F3', lav: '#FBEBDD', hero: '#FFF2E6' },
    Tired:   { bg: '#F6F4F9', lav: '#E9E6EE', hero: '#EFECF4' },
    Default: { bg: '#FCFAF7', lav: '#F0EAF9', hero: '#F3EEFB' }
  };
  const root = document.documentElement.style;
  const applyTint = (name) => {
    const t = TINTS[name] || TINTS.Default;
    root.setProperty('--bg', t.bg);
    root.setProperty('--lav', t.lav);
    root.setProperty('--hero-a', t.hero);
    $$('#moodPick button').forEach((b) => b.classList.toggle('on', b.dataset.tint === name));
  };
  const moodPicks = $$('#moodPick button');
  moodPicks.forEach((b) => b.addEventListener('click', () => {
    const name = b.dataset.tint;
    const isOn = b.classList.contains('on');
    const next = isOn ? 'Default' : name;
    applyTint(next);
    store.set('tint', next);
    toast(isOn ? 'Back to the default look' : `Page tinted for ${name} ✦`);
  }));
  applyTint(store.get('tint', 'Default'));

  /* ================= FEATURE 4: Command palette (Ctrl/Cmd + K) ================= */
  const palette = $('#palette');
  const palInput = $('#palInput');
  const palList = $('#palList');
  let palItems = [];
  let palIndex = 0;

  const openChat = (open) => {
    const panel = $('#chatPanel');
    panel.hidden = !open;
    $('#companionBtn').setAttribute('aria-expanded', String(open));
    if (open) $('#chatInput').focus();
  };

  const commands = () => [
    { group: 'Jump to', label: 'Features', run: () => go('#features') },
    { group: 'Jump to', label: 'How It Works', run: () => go('#experiences') },
    { group: 'Jump to', label: 'Desktop App', run: () => go('#desktop') },
    { group: 'Jump to', label: 'Scroll tour', run: () => go('#tour') },
    { group: 'Jump to', label: 'Mood Center', run: () => go('#mood') },
    { group: 'Jump to', label: 'Memory Vault', run: () => go('#memory') },
    { group: 'Jump to', label: 'Creative Studio', run: () => go('#creative') },
    { group: 'Jump to', label: 'Wellness', run: () => go('#wellness') },
    { group: 'Jump to', label: 'Privacy', run: () => go('#privacy') },
    { group: 'Actions', label: 'Open Mochi chat', run: () => openChat(true) },
    { group: 'Actions', label: 'Start voice input', run: () => { go('#hero'); $('#micBtn').click(); } },
    { group: 'Actions', label: 'Start focus timer', run: () => { go('#wellness'); $('#timerBtn').click(); } },
    { group: 'Actions', label: 'Log a glass of water', run: () => { go('#wellness'); addGlass(); } },
    { group: 'Actions', label: 'Turn on hydration reminders', run: () => { go('#wellness'); $('#remindBtn').click(); } },
    { group: 'Actions', label: 'Preview Mochi\'s voice', run: () => { go('#personalize'); $('#previewVoice').click(); } },
    { group: 'Actions', label: 'Add a memory', run: () => { go('#memory'); setTimeout(() => $('#memText').focus(), 400); } },
    { group: 'Actions', label: 'Celebrate with Mochi', run: () => { const r = heroMascot.getBoundingClientRect(); if (!reduce) burst(r.left + r.width / 2, r.top + r.height / 2); } }
  ];

  const renderPalette = () => {
    const q = palInput.value.trim().toLowerCase();
    palItems = commands().filter((c) => c.label.toLowerCase().includes(q));
    if (palIndex >= palItems.length) palIndex = 0;
    palList.innerHTML = '';
    if (!palItems.length) {
      const li = document.createElement('li');
      li.className = 'empty-res';
      li.textContent = 'No matches. Try "memory" or "focus".';
      palList.appendChild(li);
      return;
    }
    palItems.forEach((c, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.className = i === palIndex ? 'sel' : '';
      li.innerHTML = `<span>${escapeHtml(c.label)}</span><small>${escapeHtml(c.group)}</small>`;
      li.addEventListener('mousemove', () => { palIndex = i; highlight(); });
      li.addEventListener('click', () => runPalette(i));
      palList.appendChild(li);
    });
  };
  const highlight = () => {
    $$('li', palList).forEach((li, i) => li.classList.toggle('sel', i === palIndex));
  };
  const openPalette = () => {
    palette.hidden = false;
    palInput.value = '';
    palIndex = 0;
    renderPalette();
    setTimeout(() => palInput.focus(), 20);
  };
  const closePalette = () => { palette.hidden = true; };
  const runPalette = (i) => {
    const cmd = palItems[i];
    closePalette();
    if (cmd) setTimeout(cmd.run, 60);
  };

  $('#palBtn').addEventListener('click', openPalette);
  palInput.addEventListener('input', () => { palIndex = 0; renderPalette(); });
  palInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palIndex = Math.min(palIndex + 1, palItems.length - 1); highlight(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); palIndex = Math.max(palIndex - 1, 0); highlight(); }
    if (e.key === 'Enter') { e.preventDefault(); runPalette(palIndex); }
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  });
  $('.palette-backdrop').addEventListener('click', closePalette);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      palette.hidden ? openPalette() : closePalette();
    } else if (e.key === 'Escape' && !palette.hidden) {
      closePalette();
    } else if (e.key === 'Escape' && !$('#chatPanel').hidden) {
      openChat(false);
    }
  });

  /* ================= Hero: counters + mood bar ================= */
  const countTo = (el, target, ms = 1200) => {
    const start = performance.now();
    const step = (t) => {
      const p = Math.min((t - start) / ms, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const memCountEl = $('#memCount');
  const moodBar = $('#moodBar');
  if (memCountEl) countTo(memCountEl, 48);
  if (moodBar) requestAnimationFrame(() => { moodBar.style.width = '72%'; });

  /* ================= FEATURE 5: Real voice input (Web Speech API) ================= */
  const typed = $('#typed');
  const micBtn = $('#micBtn');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  let listening = false;

  const sendToChat = (text) => {
    const body = $('#chatBody');
    const u = document.createElement('div');
    u.className = 'msg user';
    u.textContent = text;
    body.appendChild(u);
    body.scrollTop = body.scrollHeight;
    setTimeout(() => {
      const b = document.createElement('div');
      b.className = 'msg bot';
      b.textContent = 'Got it! (Demo reply. Connect the Mochi backend for real answers.)';
      body.appendChild(b);
      body.scrollTop = body.scrollHeight;
    }, 500);
  };

  const stopListening = () => {
    listening = false;
    micBtn.classList.remove('on');
    micBtn.setAttribute('aria-pressed', 'false');
    micBtn.setAttribute('aria-label', 'Start voice input');
    typed.dataset.live = '0';
    try { rec && rec.stop(); } catch (e) { /* already stopped */ }
  };
  const startListening = () => {
    if (!rec) { toast('Voice input works in Chrome or Edge, on https or localhost.'); return; }
    listening = true;
    typed.dataset.live = '1';
    micBtn.classList.add('on');
    micBtn.setAttribute('aria-pressed', 'true');
    micBtn.setAttribute('aria-label', 'Stop voice input');
    try { rec.start(); } catch (e) { /* already running */ }
    typed.textContent = 'Listening…';
  };

  if (!SR) {
    micBtn.disabled = true;
    micBtn.title = 'Voice input needs Chrome or Edge';
  } else {
    rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          const finalText = res[0].transcript.trim();
          if (finalText) sendToChat(finalText);
        } else {
          interim += res[0].transcript;
        }
      }
      const latest = e.results[e.results.length - 1][0].transcript.trim();
      typed.textContent = `"${interim.trim() || latest}"`;
    };
    rec.onerror = (e) => {
      stopListening();
      toast(e.error === 'not-allowed' ? 'Microphone permission was blocked.' : 'Voice input stopped.');
    };
    rec.onend = () => { if (listening) { try { rec.start(); } catch (e) { stopListening(); } } };
  }

  micBtn.addEventListener('click', () => (listening ? stopListening() : startListening()));

  /* ================= Hero typewriter (paused while live) ================= */
  const lines = [
    '"Remind me to drink water at 4…"',
    '"Save this as my launch milestone."',
    '"What should I create next?"'
  ];
  let li = 0, ci = 0, deleting = false;
  const typeTick = () => {
    if (typed.dataset.live === '1') return setTimeout(typeTick, 400);
    const text = lines[li];
    if (!deleting) {
      ci++;
      typed.textContent = text.slice(0, ci);
      if (ci === text.length) { deleting = true; return setTimeout(typeTick, 2200); }
      return setTimeout(typeTick, 60);
    }
    ci--;
    typed.textContent = text.slice(0, ci);
    if (ci === 0) { deleting = false; li = (li + 1) % lines.length; return setTimeout(typeTick, 400); }
    setTimeout(typeTick, 28);
  };
  if (typed && !reduce) typeTick();

  /* ================= Desktop popup direction demo ================= */
  const popup = $('#popup');
  const dirBtns = $$('.dir');
  const setDir = (dir) => {
    popup.classList.add('hide');
    setTimeout(() => { popup.dataset.dir = dir; popup.classList.remove('hide'); }, 250);
    dirBtns.forEach((b) => b.classList.toggle('active', b.dataset.dir === dir));
  };
  dirBtns.forEach((b) => b.addEventListener('click', () => setDir(b.dataset.dir)));

  /* ================= FEATURE 10: Desktop mascot drags + snaps to an edge ================= */
  const dm = $('#deskMochi');
  const wall = $('#wall');
  let dragging = false;
  let moved = false;
  let offX = 0, offY = 0;
  const SNAP_GAP = 12;

  dm.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    const r = dm.getBoundingClientRect();
    offX = e.clientX - r.left;
    offY = e.clientY - r.top;
    dm.setPointerCapture(e.pointerId);
    dm.classList.add('dragging');
  });
  dm.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    moved = true;
    const w = wall.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - w.left - offX, 0), w.width - dm.offsetWidth);
    const y = Math.min(Math.max(e.clientY - w.top - offY, 30), w.height - dm.offsetHeight);
    dm.style.right = 'auto';
    dm.style.bottom = 'auto';
    dm.style.left = `${x}px`;
    dm.style.top = `${y}px`;
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    dm.classList.remove('dragging');
    if (!moved) return;
    snapToEdge();
  };
  dm.addEventListener('pointerup', endDrag);
  dm.addEventListener('pointercancel', endDrag);

  const snapToEdge = () => {
    const w = wall.getBoundingClientRect();
    const mw = dm.offsetWidth, mh = dm.offsetHeight;
    const x = parseFloat(dm.style.left) || 0;
    const y = parseFloat(dm.style.top) || 0;
    const d = {
      left: x,
      right: w.width - (x + mw),
      top: y - 30,
      bottom: w.height - (y + mh) - 70
    };
    const edge = Object.keys(d).reduce((a, b) => (d[a] <= d[b] ? a : b));
    let nx = x, ny = y;
    if (edge === 'left') nx = SNAP_GAP;
    if (edge === 'right') nx = w.width - mw - SNAP_GAP;
    if (edge === 'top') ny = 30 + SNAP_GAP;
    if (edge === 'bottom') ny = w.height - mh - 70;
    dm.style.left = `${nx}px`;
    dm.style.top = `${ny}px`;
    // Pop the chat bubble out from the edge Mochi landed on
    popup.classList.add('hide');
    setTimeout(() => {
      popup.dataset.dir = edge;
      popup.classList.remove('hide');
    }, 250);
    dirBtns.forEach((b) => b.classList.toggle('active', b.dataset.dir === edge));
    toast(`Mochi snapped to the ${edge} edge`);
  };

  /* ================= Mood Center states ================= */
  const stateCards = $$('.state');
  stateCards.forEach((card) => card.addEventListener('click', () => {
    stateCards.forEach((c) => c.classList.toggle('active', c === card));
  }));

  /* ================= Mood analytics ================= */
  const barEls = $$('#bars > div');
  const barsIo = new IntersectionObserver((entries, o) => {
    if (entries[0].isIntersecting) {
      barEls.forEach((b) => { b.style.height = `${b.dataset.h}%`; });
      o.disconnect();
    }
  }, { threshold: 0.3 });
  barsIo.observe($('#bars'));

  const moodInsight = $('#insight');
  $$('.mood-chip').forEach((chip) => chip.addEventListener('click', () => {
    chip.classList.toggle('on');
    const selected = $$('.mood-chip.on').map((c) => c.dataset.mood);
    moodInsight.textContent = selected.length
      ? `You checked in as ${selected.join(', ')} this week.`
      : 'Your most focused day was Tuesday.';
  }));

  /* ================= FEATURE 9: Memory Vault that saves ================= */
  const CAT_SUB = {
    Milestone: 'Saved as a milestone',
    Achievement: 'Learning achievement',
    Conversation: 'Conversation',
    Preference: 'Preference · approved by you'
  };
  const CAT_TAG = { Milestone: 'lav-t', Achievement: 'pink-t', Conversation: 'peach-t', Preference: 'blue-t' };
  const SEED = [
    { id: 1, text: 'Shipped the first version of my portfolio', cat: 'Milestone', date: '2026-10-28' },
    { id: 2, text: 'Finished the React course module on hooks', cat: 'Achievement', date: '2026-10-19' },
    { id: 3, text: 'Prefers short replies in the morning', cat: 'Preference', date: '2026-10-12' },
    { id: 4, text: 'Funny chat about a very brave houseplant', cat: 'Conversation', date: '2026-09-30' }
  ];
  let memories = store.get('memories', SEED);
  let memFilter = 'all';
  let memQuery = '';
  let editingId = null;
  const timeline = $('#timeline');
  const memEmpty = $('#memEmpty');
  const memSearch = $('#memSearch');

  const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const saveMemories = () => store.set('memories', memories);

  const renderMemories = (flashId) => {
    const visible = memories
      .filter((m) => memFilter === 'all' || m.cat === memFilter)
      .filter((m) => m.text.toLowerCase().includes(memQuery))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    timeline.innerHTML = '';
    visible.forEach((m) => {
      const li = document.createElement('li');
      li.className = 'mem' + (m.id === flashId ? ' new' : '');
      li.dataset.id = m.id;
      if (m.id === editingId) {
        li.innerHTML = `
          <span class="dt">${fmtDate(m.date)}</span>
          <div class="body">
            <div class="mem-edit">
              <input type="text" maxlength="140" value="${escapeHtml(m.text)}" aria-label="Edit memory" />
              <button class="btn btn-primary btn-sm" data-act="save" type="button">Save</button>
              <button class="btn btn-ghost btn-sm" data-act="cancel" type="button">Cancel</button>
            </div>
          </div>`;
      } else {
        li.innerHTML = `
          <span class="dt">${fmtDate(m.date)}</span>
          <div class="body">
            <b>${escapeHtml(m.text)}</b>
            <small>${CAT_SUB[m.cat] || m.cat}</small>
            <span class="tagc ${CAT_TAG[m.cat] || 'lav-t'}">${escapeHtml(m.cat)}</span>
          </div>
          <div class="acts">
            <button class="icon-action" data-act="edit" type="button" aria-label="Edit memory" title="Edit">✎</button>
            <button class="icon-action" data-act="delete" type="button" aria-label="Delete memory" title="Delete">🗑</button>
          </div>`;
      }
      timeline.appendChild(li);
    });
    memEmpty.hidden = visible.length > 0;
    if (flashId) setTimeout(() => $$('.mem.new').forEach((el) => el.classList.remove('new')), 500);
  };

  timeline.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const item = btn.closest('.mem');
    const id = Number(item.dataset.id);
    const act = btn.dataset.act;
    if (act === 'edit') { editingId = id; renderMemories(); const input = $('.mem-edit input', timeline); if (input) input.focus(); return; }
    if (act === 'cancel') { editingId = null; renderMemories(); return; }
    if (act === 'save') {
      const val = $('.mem-edit input', timeline).value.trim();
      if (!val) { toast('A memory needs some text.'); return; }
      memories = memories.map((m) => (m.id === id ? { ...m, text: val } : m));
      editingId = null; saveMemories(); renderMemories(); toast('Memory updated');
      return;
    }
    if (act === 'delete') {
      const removed = memories.find((m) => m.id === id);
      memories = memories.filter((m) => m.id !== id);
      saveMemories(); renderMemories();
      toast(`Deleted “${removed.text.slice(0, 28)}…”`);
    }
  });
  timeline.addEventListener('keydown', (e) => {
    if (e.target.matches('.mem-edit input') && e.key === 'Enter') { $('[data-act="save"]', timeline).click(); }
    if (e.target.matches('.mem-edit input') && e.key === 'Escape') { $('[data-act="cancel"]', timeline).click(); }
  });

  $('#memForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('#memText').value.trim();
    if (!text) { toast('Write a little something to remember.'); return; }
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const m = { id: Date.now(), text, cat: $('#memCat').value, date: iso };
    memories.unshift(m);
    saveMemories();
    $('#memText').value = '';
    renderMemories(m.id);
    toast('Saved to your Memory Vault ✦');
  });

  $$('.filter').forEach((f) => f.addEventListener('click', () => {
    memFilter = f.dataset.f;
    $$('.filter').forEach((x) => x.classList.toggle('on', x === f));
    renderMemories();
  }));
  memSearch.addEventListener('input', () => { memQuery = memSearch.value.trim().toLowerCase(); renderMemories(); });

  $$('.toggle').forEach((btn) => btn.addEventListener('click', () => {
    const on = !btn.classList.contains('on');
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
  }));
  renderMemories();

  /* ================= Creative Studio ================= */
  const toolData = {
    product: { label: 'Product Lab · Brainstorm', prompt: 'Brainstorm three features for a focus app that helps students study in short sessions…', title: 'Three feature ideas', body: '<b>1. Session Sprinter</b><br />Break study time into 15-minute sprints with a gentle check-in between each one.<br /><br /><b>2. Recall Garden</b><br />Turn notes into small quizzes that grow a visual garden as you remember.<br /><br /><b>3. Quiet Mode Companion</b><br />Mochi reminds you to stretch and hydrate, then returns you to your session.' },
    social:  { label: 'Social Studio · Caption', prompt: 'Write a LinkedIn post announcing our new study app launch…', title: 'Launch post draft', body: '<b>Hook</b><br />Study sessions just got a little more magical.<br /><br /><b>Body</b><br />Meet Mochi, the AI companion that keeps your focus gentle and your breaks on time.<br /><br /><b>CTA</b><br />Try it free on the web today.' },
    design:  { label: 'Design Playground · Layout', prompt: 'Suggest a calm dashboard layout for a wellness app with soft lavender tones…', title: 'Layout directions', body: '<b>A. Focus-first</b><br />One large timer card, habits in a row beneath it.<br /><br /><b>B. Mood-first</b><br />Mascot state at the top, with analytics below.<br /><br /><b>C. Balanced grid</b><br />Equal cards for hydration, focus, and habits.' },
    prompt:  { label: 'Prompt Atelier · Persona', prompt: 'Create a friendly study-buddy persona with clear limits and tone rules…', title: 'Persona draft', body: '<b>Name</b><br />Mochi, a warm and playful study buddy.<br /><br /><b>Tone</b><br />Encouraging, short sentences, never pushy.<br /><br /><b>Limits</b><br />Suggests breaks, never gives medical advice.' }
  };
  const tools = $$('.tool');
  const prompt = $('#prompt');
  const toolLabel = $('#toolLabel');
  const outTitle = $('#outTitle');
  const outBody = $('#outBody');
  const setTool = (key) => {
    const d = toolData[key];
    tools.forEach((t) => t.classList.toggle('active', t.dataset.tool === key));
    prompt.value = d.prompt;
    toolLabel.textContent = d.label;
    outTitle.textContent = d.title;
    outBody.innerHTML = d.body;
  };
  tools.forEach((t) => t.addEventListener('click', () => setTool(t.dataset.tool)));
  setTool('product');

  $$('#outputTypes button').forEach((b) => b.addEventListener('click', () => {
    $$('#outputTypes button').forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('#improveBtn').addEventListener('click', () => {
    const v = prompt.value.trim();
    if (!v) return;
    if (!/audience|goal|tone/i.test(v)) prompt.value = `${v}\n\nAudience: students.\nGoal: clear, practical ideas.\nTone: warm and concise.`;
    toast('Prompt improved with audience, goal, and tone');
  });
  // Demo only: wire this to your Gemini backend.
  $('#genBtn').addEventListener('click', () => {
    outBody.classList.add('loading');
    outTitle.textContent = 'Generating…';
    setTimeout(() => {
      outBody.classList.remove('loading');
      const active = $('.tool.active');
      setTool(active ? active.dataset.tool : 'product');
    }, 900);
  });

  /* ================= Wellness: hydration (saved per day) ================= */
  const glassWrap = $('#glasses');
  const glassCount = $('#glassCount');
  const todayKey = new Date().toISOString().slice(0, 10);
  let glasses = store.get('glasses:' + todayKey, 5);

  for (let i = 0; i < 8; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Glass ${i + 1}`);
    b.addEventListener('click', () => setGlasses(i + 1 === glasses ? i : i + 1));
    glassWrap.appendChild(b);
  }
  const renderGlasses = () => {
    $$('button', glassWrap).forEach((b, i) => b.classList.toggle('f', i < glasses));
    glassCount.textContent = `${glasses} of 8 glasses · reminders every 90 minutes`;
  };
  const setGlasses = (n) => { glasses = n; store.set('glasses:' + todayKey, n); renderGlasses(); };
  const addGlass = () => { if (glasses < 8) { setGlasses(glasses + 1); toast(`Glass logged · ${glasses} of 8 ✦`); } else toast('You hit 8 glasses today. Lovely!'); };
  renderGlasses();

  /* ================= FEATURE 7: Hydration reminders that fire ================= */
  const REMIND_MS = 90 * 60 * 1000;
  const remindBtn = $('#remindBtn');
  const testRemind = $('#testRemind');
  const remindStatus = $('#remindStatus');
  let remindTimer = null;

  const canNotify = 'Notification' in window;
  const notify = (title, body) => {
    if (canNotify && Notification.permission === 'granted') {
      try { new Notification(title, { body }); return; } catch (e) { /* fall through */ }
    }
    toast(`${title}: ${body}`);
  };
  const setRemindUi = (on) => {
    remindBtn.textContent = on ? 'Turn off reminders' : 'Turn on reminders';
    remindBtn.classList.toggle('btn-ghost', on);
    remindBtn.classList.toggle('btn-primary', !on);
    remindStatus.textContent = on
      ? `Reminders are on. Next one in about ${REMIND_MS / 60000} minutes.`
      : 'Reminders are off.';
  };
  const startReminders = () => {
    clearInterval(remindTimer);
    remindTimer = setInterval(() => notify('Mochi · Hydration', 'Time for a glass of water 💧'), REMIND_MS);
    store.set('remind', true);
    setRemindUi(true);
  };
  const stopReminders = () => {
    clearInterval(remindTimer);
    remindTimer = null;
    store.set('remind', false);
    setRemindUi(false);
  };
  remindBtn.addEventListener('click', async () => {
    if (remindTimer) { stopReminders(); toast('Reminders turned off'); return; }
    if (canNotify && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) { /* ignore */ }
    }
    startReminders();
    if (canNotify && Notification.permission === 'granted') toast('Reminders on. You will get a notification.');
    else toast('Reminders on. Allow notifications to get them outside this tab.');
  });
  testRemind.addEventListener('click', () => notify('Mochi · Hydration', 'Test: time for a glass of water 💧'));
  if (store.get('remind', false) && canNotify && Notification.permission === 'granted') startReminders();
  else setRemindUi(false);

  /* ================= Wellness: focus timer ================= */
  const timerEl = $('#timer');
  const timerBtn = $('#timerBtn');
  const timerReset = $('#timerReset');
  const ring = $('#ring');
  const TOTAL = 25 * 60;
  let remaining = TOTAL;
  let tick = null;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const drawTimer = () => {
    timerEl.textContent = fmt(remaining);
    ring.style.setProperty('--p', String(Math.round(((TOTAL - remaining) / TOTAL) * 100)));
  };
  const stopTimer = () => { clearInterval(tick); tick = null; timerBtn.textContent = 'Start'; };
  timerBtn.addEventListener('click', () => {
    if (tick) { stopTimer(); return; }
    timerBtn.textContent = 'Pause';
    tick = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      drawTimer();
      if (remaining === 0) {
        stopTimer();
        remaining = TOTAL; drawTimer();
        notify('Mochi · Focus', 'Session complete. Time for a break ✦');
      }
    }, 1000);
  });
  timerReset.addEventListener('click', () => { stopTimer(); remaining = TOTAL; drawTimer(); });
  drawTimer();

  /* ================= Wellness: habits ================= */
  const habitBtns = $$('.done-btn');
  const habitDays = $('#habitDays');
  const habitBar = $('#habitBar');
  const updateHabits = () => {
    const done = habitBtns.filter((b) => b.getAttribute('aria-pressed') === 'true').length;
    const days = Math.min(3 + done, 7);
    habitDays.textContent = days;
    habitBar.style.width = `${Math.round((days / 7) * 100)}%`;
  };
  habitBtns.forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Done' : 'Log it';
    updateHabits();
  }));
  updateHabits();

  /* ================= FEATURE 6: Voice preview with speechSynthesis ================= */
  const pitch = $('#pitch');
  const speed = $('#speed');
  const pitchOut = $('#pitchOut');
  const speedOut = $('#speedOut');
  const presetTag = $('#presetTag');
  const pvTag = $('#pvTag');
  const preview = $('#preview');
  const PRESETS = { Warm: { p: 45, s: 35 }, Bright: { p: 75, s: 60 }, Calm: { p: 30, s: 22 } };
  const selection = { outfit: 'Bow', expr: 'Happy', voice: 'Warm' };
  const themes = { Lavender: '#F0EAF9', Pink: '#FCEEF3', Blue: '#E6F1F8', Mint: '#E7F6EE' };

  const updateTags = () => {
    pvTag.textContent = `${selection.outfit} · ${selection.expr} · ${selection.voice}`;
    presetTag.textContent = `Preset: ${selection.voice}`;
  };
  const syncSliders = () => {
    pitchOut.textContent = pitch.value;
    speedOut.textContent = speed.value;
  };
  pitch.addEventListener('input', () => { pitchOut.textContent = pitch.value; });
  speed.addEventListener('input', () => { speedOut.textContent = speed.value; });

  $$('.seg[data-group]').forEach((group) => {
    const key = group.dataset.group === 'outfit' ? 'outfit' : group.dataset.group === 'expr' ? 'expr' : 'voice';
    $$('button', group).forEach((b) => b.addEventListener('click', () => {
      if (b.id === 'savePreset') {
        store.set('voicePreset', { name: selection.voice, pitch: +pitch.value, speed: +speed.value });
        toast(`Saved “${selection.voice}” with your pitch and speed`);
        return;
      }
      const label = b.textContent.trim();
      selection[key] = label;
      $$('button', group).forEach((x) => x.classList.toggle('on', x === b));
      if (key === 'voice' && PRESETS[label]) {
        pitch.value = PRESETS[label].p;
        speed.value = PRESETS[label].s;
        syncSliders();
      }
      updateTags();
    }));
  });
  $$('.swatch').forEach((s) => s.addEventListener('click', () => {
    $$('.swatch').forEach((x) => x.classList.toggle('on', x === s));
    const name = s.getAttribute('aria-label');
    preview.style.background = `radial-gradient(420px 300px at 50% 40%,#fff 0%,transparent 70%),linear-gradient(170deg,${themes[name]},#FCEEF3)`;
  }));

  $('#previewVoice').addEventListener('click', () => {
    if (!('speechSynthesis' in window)) { toast('Voice preview needs a browser with speech support.'); return; }
    const u = new SpeechSynthesisUtterance("Hi, I'm Mochi. Let's make something wonderful.");
    // Map 0–100 sliders onto the browser's ranges
    u.pitch = 0.6 + (+pitch.value / 100) * 0.9; // 0.6 – 1.5
    u.rate = 0.7 + (+speed.value / 100) * 0.8;  // 0.7 – 1.5
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });

  /* ================= FEATURE 8: Scroll-driven MacBook tour ================= */
  const steps = $$('.step');
  const views = $$('.view');
  const showView = (idx) => {
    steps.forEach((s) => s.classList.toggle('on', +s.dataset.view === idx));
    views.forEach((v) => v.classList.toggle('on', +v.dataset.view === idx));
  };
  const tourIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) showView(+e.target.dataset.view); });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  steps.forEach((s) => tourIo.observe(s));

  /* ================= Floating Mochi companion chat ================= */
  const companionBtn = $('#companionBtn');
  const chatPanel = $('#chatPanel');
  const chatBody = $('#chatBody');
  const chatForm = $('#chatForm');
  const chatInput = $('#chatInput');
  companionBtn.addEventListener('click', () => openChat(chatPanel.hidden));
  $('#chatClose').addEventListener('click', () => openChat(false));

  const addChatMsg = (text, who) => {
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  };
  const botReply = (q) => {
    const t = q.toLowerCase();
    if (t.includes('hydrat') || t.includes('water')) {
      setTimeout(() => { if (!remindTimer) startReminders(); }, 0);
      return 'Done! Hydration reminders are on. You can turn them off in the Wellness section.';
    }
    if (t.includes('can you do') || t.includes('help')) return 'I can chat with you, remember what you approve, track water and focus breaks, and help you brainstorm in the Creative Studio.';
    return 'Thanks for telling me! This is a demo chat, so replies are simple for now. Connect the Mochi backend for full answers.';
  };
  const send = (text) => {
    const clean = text.trim();
    if (!clean) return;
    addChatMsg(clean, 'user');
    setTimeout(() => addChatMsg(botReply(clean), 'bot'), 500);
  };
  chatForm.addEventListener('submit', (e) => { e.preventDefault(); send(chatInput.value); chatInput.value = ''; });
  $$('.quick [data-q]').forEach((b) => b.addEventListener('click', () => send(b.dataset.q)));

  /* ================= Restore saved voice preset (if any) ================= */
  const savedPreset = store.get('voicePreset', null);
  if (savedPreset) {
    pitch.value = savedPreset.pitch;
    speed.value = savedPreset.speed;
    syncSliders();
  }
})();
