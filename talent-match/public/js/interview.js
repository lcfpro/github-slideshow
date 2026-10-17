// 模擬面接ルーム: 面接官アバターが質問を読み上げ（音声合成）、回答は音声入力またはテキスト。
// 1問ごとに採点し、最後に総合フィードバックを表示する。
import { api, esc, toast } from './core.js';
import { ring } from './charts.js';

function interviewerSvg(color = '#2a78d6') {
  return `<svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect x="80" y="120" width="300" height="200" rx="8" fill="#ffffff55"/><rect x="100" y="140" width="260" height="160" fill="#9cc3e6"/>
    <path d="M100 300 L190 220 L250 260 L300 200 L360 300Z" fill="#6fa36f"/>
    <rect x="1250" y="160" width="160" height="220" rx="6" fill="#00000014"/><rect x="1270" y="180" width="120" height="16" fill="${color}"/>
    <rect x="1270" y="210" width="90" height="10" fill="#00000022"/><rect x="1270" y="230" width="100" height="10" fill="#00000022"/>
    <g transform="translate(800 520)">
      <path d="M-210 300 Q-200 90 0 80 Q200 90 210 300Z" fill="#1f2a44"/>
      <path d="M-40 90 L0 170 L40 90Z" fill="#fff"/><path d="M-10 100 L0 190 L10 100Z" fill="${color}"/>
      <rect x="-28" y="40" width="56" height="50" fill="#eac09d"/>
      <ellipse cx="0" cy="-30" rx="92" ry="105" fill="#f2cba9"/>
      <path d="M-96 -40 Q-100 -150 0 -150 Q100 -150 96 -40 Q80 -110 0 -105 Q-80 -110 -96 -40Z" fill="#2b2118"/>
      <g class="blink"><ellipse cx="-34" cy="-30" rx="9" ry="11" fill="#222"/><ellipse cx="34" cy="-30" rx="9" ry="11" fill="#222"/></g>
      <path d="M-55 -58 Q-34 -68 -14 -58" stroke="#2b2118" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M14 -58 Q34 -68 55 -58" stroke="#2b2118" stroke-width="6" fill="none" stroke-linecap="round"/>
      <ellipse class="mouth" cx="0" cy="30" rx="22" ry="7" fill="#8a3d33"/>
    </g>
    <rect x="0" y="790" width="1600" height="110" fill="#6b4f36"/><rect x="0" y="780" width="1600" height="14" fill="#7d5d40"/>
    <rect x="620" y="740" width="200" height="50" rx="4" fill="#f5f5f5"/><rect x="900" y="755" width="70" height="30" rx="4" fill="#2b2b2b"/>
  </svg>`;
}

export function mountInterview(el, { jobId, onDone }) {
  let data;
  let idx = 0;
  const results = [];
  let timer = null;
  let left = 0;
  let recog = null;
  let stream = null;
  const voice = { on: 'speechSynthesis' in window };

  const speak = (text, room) => {
    if (!voice.on) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 1.05;
    u.onstart = () => room?.classList.add('talking');
    u.onend = () => room?.classList.remove('talking');
    speechSynthesis.speak(u);
  };

  const cleanup = () => {
    clearInterval(timer);
    recog?.abort?.();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    stream?.getTracks().forEach((t) => t.stop());
  };

  async function start() {
    data = await api(`/api/interview/questions${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ''}`);
    intro();
  }

  function intro() {
    el.innerHTML = `<div class="card">
      <h2>🎤 模擬面接ルーム</h2>
      <p>${data.company ? `<b>${esc(data.company.name)}</b> の「${esc(data.job.title)}」を想定した` : `${esc(data.role)} 向けの`}本番形式の面接です。面接官が質問を読み上げます。制限時間内に回答してください。</p>
      <ul class="muted"><li>質問数: ${data.questions.length}問（約${Math.round(data.questions.reduce((s, q) => s + q.seconds, 0) / 60)}分）</li><li>音声で回答（対応ブラウザ）またはテキスト入力</li><li>カメラをONにすると表情・目線のセルフチェックができます（映像は送信されません）</li></ul>
      <div class="row"><label class="row"><input type="checkbox" id="cam"> カメラをONにする</label><label class="row"><input type="checkbox" id="voice" ${voice.on ? 'checked' : 'disabled'}> 質問を読み上げる</label></div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="go">入室して開始</button></div>
    </div>`;
    el.querySelector('#go').addEventListener('click', async () => {
      voice.on = el.querySelector('#voice').checked;
      if (el.querySelector('#cam').checked && navigator.mediaDevices?.getUserMedia) {
        try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); } catch { toast('カメラを利用できませんでした'); }
      }
      ask();
    });
  }

  function ask() {
    const q = data.questions[idx];
    left = q.seconds;
    el.innerHTML = `<div class="room" id="room">${interviewerSvg(data.company?.color)}
        <div class="bubble"><div class="tiny">${esc(data.interviewer.name)}・質問 ${idx + 1}/${data.questions.length}</div>${esc(q.q)}</div>
        <div class="timer" id="tm">⏱ ${left}s</div>
        ${stream ? '<div class="selfcam"><video autoplay muted playsinline></video></div>' : ''}
      </div>
      <div class="card" style="margin-top:12px">
        <div class="row between"><b>あなたの回答</b><span class="tiny">評価観点: ${esc(q.intent)}</span></div>
        <textarea class="input" id="ans" placeholder="ここに回答を入力、または🎙ボタンで話してください" style="min-height:120px;margin-top:8px"></textarea>
        <div class="row between" style="margin-top:8px">
          <div class="row"><button class="btn" id="mic" ${'webkitSpeechRecognition' in window || 'SpeechRecognition' in window ? '' : 'disabled title="このブラウザは音声入力に未対応です"'}>🎙 音声で回答</button><button class="btn ghost" id="replay">🔊 もう一度聞く</button></div>
          <div class="row"><button class="btn ghost" id="skip">スキップ</button><button class="btn primary" id="send">回答する</button></div>
        </div>
        <div id="fb"></div>
      </div>`;
    const room = el.querySelector('#room');
    if (stream) el.querySelector('video').srcObject = stream;
    speak(q.q, room);
    clearInterval(timer);
    timer = setInterval(() => {
      left--;
      const tm = el.querySelector('#tm');
      if (!tm) return clearInterval(timer);
      tm.textContent = `⏱ ${left}s`;
      if (left <= 10) tm.style.background = 'rgba(208,59,59,.85)';
      if (left <= 0) { clearInterval(timer); submit(true); }
    }, 1000);
    el.querySelector('#replay').addEventListener('click', () => speak(q.q, room));
    el.querySelector('#skip').addEventListener('click', () => { results.push({ q: q.q, answer: '', score: 0, good: '', improve: 'スキップしました' }); next(); });
    el.querySelector('#send').addEventListener('click', () => submit(false));
    el.querySelector('#mic').addEventListener('click', (e) => toggleMic(e.currentTarget));
  }

  function toggleMic(btn) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recog) { recog.stop(); recog = null; btn.innerHTML = '🎙 音声で回答'; return; }
    const ta = el.querySelector('#ans');
    const base = ta.value;
    recog = new SR();
    recog.lang = 'ja-JP';
    recog.continuous = true;
    recog.interimResults = true;
    recog.onresult = (ev) => {
      let text = '';
      for (const r of ev.results) text += r[0].transcript;
      ta.value = `${base}${text}`;
    };
    recog.onend = () => { recog = null; btn.innerHTML = '🎙 音声で回答'; };
    recog.start();
    btn.innerHTML = '<span class="rec">●</span> 録音中（クリックで停止）';
  }

  async function submit(timeout) {
    clearInterval(timer);
    recog?.stop();
    const q = data.questions[idx];
    const answer = el.querySelector('#ans')?.value || '';
    const btn = el.querySelector('#send');
    if (btn) btn.disabled = true;
    const r = await api('/api/interview/evaluate', { method: 'POST', body: { question: q.q, answer, jobId } });
    results.push({ q: q.q, answer, ...r });
    el.querySelector('#fb').innerHTML = `<div class="row" style="margin-top:12px;align-items:flex-start">${ring(r.score, 64)}<div class="grow" style="flex:1">
      ${timeout ? '<p class="status" style="color:var(--critical)">⏰ 時間切れ</p>' : ''}
      <p><b>👍 良い点:</b> ${esc(r.good)}</p><p><b>💡 改善点:</b> ${esc(r.improve)}</p>
      <div class="row">${Object.entries(r.star || {}).map(([k, v]) => `<span class="chip ${v ? 'ok' : 'miss'}">${v ? '✓' : '✗'} ${{ S: '状況', T: '課題', A: '行動', R: '結果' }[k]}</span>`).join('')}</div>
    </div></div><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn primary" id="nx">${idx + 1 < data.questions.length ? '次の質問へ →' : '結果を見る'}</button></div>`;
    el.querySelector('#nx').addEventListener('click', next);
    speak(r.score >= 70 ? 'ありがとうございます。よく分かりました。' : 'ありがとうございます。', el.querySelector('#room'));
  }

  async function next() {
    idx++;
    if (idx < data.questions.length) return ask();
    cleanup();
    const avg = Math.round(results.reduce((s, r) => s + (r.score || 0), 0) / results.length);
    try { await api('/api/interview/sessions', { method: 'POST', body: { jobId, results } }); } catch { /* 企業ユーザー等は保存しない */ }
    el.innerHTML = `<div class="card"><div class="row">${ring(avg, 96)}<div><h2 style="margin:0">面接終了 — 総合 ${avg}点</h2><p class="muted">${avg >= 75 ? '本番でも十分戦えるレベルです。' : avg >= 55 ? 'あと一歩。改善点を意識してもう一度練習しましょう。' : '回答の構成（STAR）と具体性を意識して再挑戦しましょう。'}</p></div></div>
      <table class="t" style="margin-top:12px"><thead><tr><th>質問</th><th>点数</th><th>改善点</th></tr></thead><tbody>
      ${results.map((r) => `<tr><td>${esc(r.q)}</td><td class="num"><b>${r.score}</b></td><td>${esc(r.improve)}</td></tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="again">もう一度挑戦</button></div></div>`;
    el.querySelector('#again').addEventListener('click', () => { idx = 0; results.length = 0; intro(); });
    onDone?.(avg);
  }

  start().catch((e) => { el.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; });
  return cleanup;
}
