const config = {
    easy: { 
        symbols: ["|", "ー", "＋"], 
        sounds: ["line1v.mp3", "line1h.mp3", "cross.mp3"],
        displayNames: ["ごごご、ごめんなさ～い！", "フレーフレー", "ぱんぱかぱーん！"] // 答えとして表示する名前
    },
    normal: { 
        symbols: ["▽", "◇", "▼", "◆", "♡"], 
        sounds: ["shita_sankaku.mp3", "dia.mp3", "kuro_shita_sankaku.mp3", "kuro_dia.mp3", "heart.mp3"],
        displayNames: ["だって・・・だってぇ～・・・ヒック", "やったーー！", "げげ～・・・", "もう知らない！", "バイバーイ"]
    },
    hard: { 
        symbols: ["〇", "△", "□", "●", "▲", "■", "||", "=", "|||", "≡"], 
        sounds: ['maru.mp3', 'sankaku.mp3', 'shikaku.mp3', 'kuromaru.mp3', 'kurosankaku.mp3', 'kuroshikaku.mp3', 'line2v.mp3', 'line2h.mp3', 'line3v.mp3', 'line3h.mp3'],
        displayNames: ["あははははっ！あははははっ！あははっ！あははっ！", "えー・・・", "がんばれー", "キャー！やだー恥ずかし～！", "シラナイデスヨ", "ちょっと待って", "ハアーイ", "や、やだな～本気にしないでよぉ", "喝(かーーつ)！", "打つべし！打つべし！"]
    }
};

        let shuffledSounds = { easy: [], normal: [], hard: [] };
        function initShuffledSounds() {
            for (let mode in config) { shuffledSounds[mode] = [...config[mode].sounds]; }
        }
        initShuffledSounds();

        let currentMode = "hard";
        let reelIntervals = [null, null, null];
        let reelResults = [null, null, null];
        let stoppedCount = 0;
        let autoTimer = null;
        let activeAudios = [];
        let currentSingleVoice = null;

        const audioSpin = new Audio('spin.mp3');
        audioSpin.loop = true;
        const audioStopSe = new Audio('stop_btn.mp3');
        const audioBtn = new Audio('btn.mp3'); // 共通ボタンSE

        // ボタン音を鳴らす関数
        function playBtnSound() {
            const b = audioBtn.cloneNode();
            b.play();
        }

        // ラッパー関数：SEを鳴らしてから元の処理を実行
        function handleShuffle() { playBtnSound(); shuffleSounds(); }
        function handleStart() { playBtnSound(); startSlot(); }
        function handleReset() { playBtnSound(); resetSlot(); }
        function handleDifficultyChange() { playBtnSound(); changeDifficulty(); }
	function handleAnswer() { playBtnSound(); toggleAnswer()}

        function shuffleSounds() {
            const arr = shuffledSounds[currentMode];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            document.getElementById("message").innerText = "ボイスを入れ替えました！";
            setTimeout(() => { if(stoppedCount === 0) document.getElementById("message").innerText = ""; }, 2000);
        }

        function playManagedAudio(audioPath) {
            const audio = new Audio(audioPath);
            activeAudios.push(audio);
            audio.play();
            audio.onended = () => { activeAudios = activeAudios.filter(a => a !== audio); };
            return audio;
        }

        function changeDifficulty() {
            resetSlot();
            currentMode = document.getElementById("difficulty").value;
            for(let i=0; i<3; i++) {
                document.getElementById(`reel${i}`).innerText = config[currentMode].symbols[0];
            }
        }

        function startSlot() {
            clearTimeout(autoTimer);
            document.getElementById("machine-body").classList.remove("pikapika"); // 光る演出を消す
            stoppedCount = 0;
            reelResults = [null, null, null];
            document.getElementById("start-btn").disabled = true;
            document.getElementById("reset-btn").disabled = false;
            document.getElementById("difficulty").disabled = true;
            document.getElementById("deduction-mode").disabled = true;
            document.getElementById("shuffle-btn").disabled = true;
            document.getElementById("message").innerText = "";
            
            audioSpin.play().catch(() => {});

            for (let i = 0; i < 3; i++) {
                document.getElementById(`stop${i}`).disabled = false;
                reelIntervals[i] = setInterval(() => {
                    const modeData = config[currentMode];
                    const idx = Math.floor(Math.random() * modeData.symbols.length);
                    const reelEl = document.getElementById(`reel${i}`);
                    reelEl.innerText = modeData.symbols[idx];
                    reelEl.dataset.index = idx;
                }, 50);
            }
        }

        function stopReel(i) {
            if (reelIntervals[i] === null) return;
            clearInterval(reelIntervals[i]);
            reelIntervals[i] = null;
            document.getElementById(`stop${i}`).disabled = true;
            
            const currentIdx = document.getElementById(`reel${i}`).dataset.index;
            reelResults[i] = currentIdx;
            stoppedCount++;

            if (currentSingleVoice) { currentSingleVoice.pause(); currentSingleVoice.currentTime = 0; }

            const s = audioStopSe.cloneNode();
            activeAudios.push(s);
            s.play();

            const isDeduction = document.getElementById("deduction-mode").checked;

            if (stoppedCount < 3) {
                if (!isDeduction) {
                    currentSingleVoice = playManagedAudio(shuffledSounds[currentMode][currentIdx]);
                }
            } else {
                document.getElementById("reset-btn").disabled = true;
                audioSpin.pause();
                audioSpin.currentTime = 0;
                s.onended = () => {
                    activeAudios = activeAudios.filter(a => a !== s);
                    playTripleSound();
                };
            }
        }

        async function playTripleSound() {
            const sounds = reelResults.map(idx => shuffledSounds[currentMode][idx]);
            const audios = sounds.map(path => playManagedAudio(path));
            
            // 揃ったか判定
            const isMatch = (reelResults[0] === reelResults[1] && reelResults[1] === reelResults[2]);
            if (isMatch) {
                document.getElementById("machine-body").classList.add("pikapika");
                document.getElementById("message").innerText = "やったー！おそろいだよ！";
            }

            await Promise.all(audios.map(a => {
                return new Promise(resolve => { a.onended = resolve; });
            }));
            handleAutoRestart(isMatch);
        }

        function handleAutoRestart(isMatch) {
            const waitTime = isMatch ? 3000 : 800;
            autoTimer = setTimeout(startSlot, waitTime);
        }

        function resetSlot() {
            clearTimeout(autoTimer);
            document.getElementById("machine-body").classList.remove("pikapika");
            reelIntervals.forEach((interval, i) => {
                if (interval) clearInterval(interval);
                reelIntervals[i] = null;
                document.getElementById(`stop${i}`).disabled = true;
            });
            activeAudios.forEach(a => { a.pause(); a.currentTime = 0; });
            activeAudios = [];
            if (currentSingleVoice) { currentSingleVoice.pause(); currentSingleVoice.currentTime = 0; }
            audioSpin.pause();
            audioSpin.currentTime = 0;

            document.getElementById("start-btn").disabled = false;
            document.getElementById("reset-btn").disabled = true;
            document.getElementById("difficulty").disabled = false;
            document.getElementById("deduction-mode").disabled = false;
            document.getElementById("shuffle-btn").disabled = false;
            document.getElementById("message").innerText = "リセットしました";
        }

        function playBackSound(e) {
            e.preventDefault(); // すぐに移動するのを防ぐ
            const audio = new Audio('btn.mp3');
            audio.play();
            setTimeout(() => {
                window.location.href = e.target.href;
            }, 150); // 音を少し鳴らしてから遷移
        }

    var submitted = false;
var googleForm = document.getElementById('google-form');
if (googleForm) { // そのページにフォームがある時だけ実行する
    googleForm.onsubmit = function() {
        submitted = true;
    };
}

    // iframeが読み込まれた（＝送信処理が終わった）時の動き
var iframe = document.getElementById('hidden_iframe');
    if (iframe) {
        iframe.onload = function() {
            if (submitted) {
                // 送信完了後のメッセージ表示
                var card = document.querySelector('.contact-form-wrapper');
                if (card) {
                    card.style.height = "auto"; // 高さを自動調整
                    card.innerHTML = 
                        '<div style="text-align:center; padding:40px; background:white; border-radius:15px;">' +
                        '<h3 style="color:var(--accent-pink);">送信完了！</h3>' +
                        '<p>メッセージを受け取ったよ！　ありがとう！</p>' +
                        '</div>';
                }
            }
        };
    }

// --- メニュー開閉の制御 ---
function toggleMenu(e) {
    if (e) e.stopPropagation(); // イベントの連鎖を止める
    
    const menu = document.getElementById('nav-menu');
    const isOpening = !menu.classList.contains('open');

    if (isOpening) {
        // メニューを開く
        menu.classList.add('open');
        // メニュー外クリック判定用の透明な幕（オーバーレイ）を作成
        createOverlay();
    } else {
        // メニューを閉じる
        closeMenu();
    }
}

// --- メニューを閉じる処理 ---
function closeMenu() {
    const menu = document.getElementById('nav-menu');
    menu.classList.remove('open');
    
    // オーバーレイがあれば消す
    const overlay = document.getElementById('menu-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// --- 透明な幕（オーバーレイ）を作る関数 ---
function createOverlay() {
    // すでに存在していれば作らない
    if (document.getElementById('menu-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'menu-overlay';
    
    // 画面全体を覆うスタイル（透明）
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '999', // ヘッダー(1000)より少し下に配置
        background: 'rgba(0,0,0,0.2)' // 完全に透明（必要なら 0.1 くらいにして確認してください）
    });

    // この幕がクリックされたらメニューを閉じる
    overlay.addEventListener('click', closeMenu);
    
    document.body.appendChild(overlay);
}




// --- 2. 答え合わせ機能 ---
function toggleAnswer() {
    const existing = document.getElementById('answer-modal');
    if (existing) {
        existing.remove();
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'answer-modal';
    
    // 現在のモードの正解リストを作成
    const currentConfig = config[currentMode];
    let tableRows = "";
    currentConfig.symbols.forEach((sym, idx) => {
        const soundFile = shuffledSounds[currentMode][idx];
	const originalIdx = currentConfig.sounds.indexOf(soundFile);
        const name = currentConfig.displayNames[originalIdx];
        
        tableRows += `<tr><td>${sym}</td><td>${name}</td></tr>`;
    });

    modal.innerHTML = `
        <div class="answer-content">
            <h3 style="margin-top:0; text-align: center;">答え合わせ</h3>
            <table>
                <thead><tr><th>絵</th><th>音声</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
            <button id="close-btn" class="btn" onclick="handleAnswer()">閉じる</button>
        </div>
    `;
// オーバーレイをクリックしても閉じるように設定
    modal.onclick = (e) => { if(e.target.id === 'answer-modal') toggleAnswer(); };
    document.body.appendChild(modal);
}
