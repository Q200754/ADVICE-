/**
 * ADVICE อ่างทอง — เกมเปิดแผ่นป้ายทายภาพ
 * 1 รูปภาพคำตอบซ่อนหลัง 35 ป้าย (5 แถว × 7 คอลัมน์)
 */

class AdviceMysteryGame {
  constructor() {
    this.totalTiles = 35;
    this.tileStates = new Array(this.totalTiles).fill(false);
    this.currentAnswerImage = null;
    this.tempPreviewImage   = null;

    // DOM refs
    this.tilesGrid        = document.getElementById('tilesGrid');
    this.answerImage      = document.getElementById('answerImage');
    this.openedCountElem  = document.getElementById('openedCount');
    this.uploadModal      = document.getElementById('uploadModal');
    this.modalPreviewImg  = document.getElementById('modalPreviewImg');
    this.toastMsg         = document.getElementById('toastMsg');
    this.toastText        = document.getElementById('toastText');
    this.toastIcon        = document.getElementById('toastIcon');
    this.confettiCanvas   = document.getElementById('confettiCanvas');
    this.confettiCtx      = this.confettiCanvas.getContext('2d');
    this.confettiParticles = [];
    this.isConfettiRunning = false;

    this.init();
  }

  async init() {
    this.setupConfettiCanvas();
    this.bindEvents();
    await this.loadAnswerImage();
    this.renderTiles();
    this.updateCounter();

    // Unlock Web Audio on first gesture
    const unlockAudio = () => {
      window.soundEngine.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown',     unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown',     unlockAudio);

    // Apply saved sound state to button styling
    this._refreshSoundBtn(true);
  }

  // ══════════════════════════════════════════════════
  // LOAD & SAVE ANSWER IMAGE
  // ══════════════════════════════════════════════════
  async loadAnswerImage() {
    const saved = await window.imageStorage.getMysteryImage();
    this.currentAnswerImage = saved || window.DEFAULT_MYSTERY_IMAGE;

    const fitMode = localStorage.getItem('advice_image_fit') || 'cover';
    this.answerImage.style.objectFit = fitMode;

    const fitCoverRadio   = document.getElementById('fitCover');
    const fitContainRadio = document.getElementById('fitContain');
    if (fitCoverRadio && fitContainRadio) {
      (fitMode === 'contain' ? fitContainRadio : fitCoverRadio).checked = true;
    }

    this.answerImage.src = this.currentAnswerImage;
    if (this.modalPreviewImg) this.modalPreviewImg.src = this.currentAnswerImage;
  }

  // ══════════════════════════════════════════════════
  // RENDER 35 TILES
  // ══════════════════════════════════════════════════
  renderTiles() {
    this.tilesGrid.innerHTML = '';

    for (let i = 1; i <= this.totalTiles; i++) {
      const tile = document.createElement('div');
      tile.className  = `tile-item${this.tileStates[i - 1] ? ' opened' : ''}`;
      tile.id         = `tile-${i}`;
      tile.dataset.number = i;
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('role', 'button');
      tile.setAttribute('aria-label', `แผ่นป้ายที่ ${i}`);

      // CSS custom property for staggered shimmer animation
      tile.style.setProperty('--tile-i', i);

      tile.innerHTML = `
        <span class="tile-advice-mini">ADVICE</span>
        <div class="tile-corner-tr"></div>
        <div class="tile-corner-bl"></div>
        <span class="tile-number">${i}</span>
      `;

      tile.addEventListener('click',   ()  => this.openTile(i - 1));
      tile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openTile(i - 1);
        }
      });

      this.tilesGrid.appendChild(tile);
    }
  }

  // ══════════════════════════════════════════════════
  // OPEN A TILE (เปิดแล้วเปิดเลย — ไม่มีปิดกลับ)
  // ══════════════════════════════════════════════════
  openTile(index) {
    if (this.tileStates[index]) return; // already open

    this.tileStates[index] = true;
    const tileElem = document.getElementById(`tile-${index + 1}`);

    if (tileElem) {
      // Burst flash then disappear
      tileElem.classList.add('opening');
      setTimeout(() => {
        tileElem.classList.remove('opening');
        tileElem.classList.add('opened');
      }, 320);

      window.soundEngine.playFlip();
      window.soundEngine.playChime(1 + (index % 7) * 0.08);
    }

    this.updateCounter();

    // All 35 opened → celebration!
    const opened = this.tileStates.filter(Boolean).length;
    if (opened === this.totalTiles) {
      setTimeout(() => {
        window.soundEngine.playFanfare();
        this.triggerConfetti();
        this.showToast('🎉 เฉลยครบทั้ง 35 ป้ายแล้ว!', '🏆');
      }, 400);
    }
  }

  updateCounter() {
    const opened = this.tileStates.filter(Boolean).length;
    if (this.openedCountElem) this.openedCountElem.textContent = opened;
  }

  // ══════════════════════════════════════════════════
  // GAME CONTROLS
  // ══════════════════════════════════════════════════

  // Reset — close all tiles
  resetGame() {
    window.soundEngine.playWhoosh();
    this.tileStates.fill(false);

    const tiles = document.querySelectorAll('.tile-item');
    tiles.forEach((tile, i) => {
      setTimeout(() => {
        tile.classList.remove('opened', 'opening', 'picking');
      }, i * 12);
    });

    this.updateCounter();
    this.showToast('เริ่มเกมใหม่แล้ว ปิดป้ายทั้ง 35 ช่อง', '🔄');
  }

  // Random pick 1 closed tile
  pickRandomTile() {
    const closed = this.tileStates
      .map((v, i) => (!v ? i : -1))
      .filter(i => i !== -1);

    if (closed.length === 0) {
      this.showToast('เปิดครบทั้ง 35 ป้ายแล้วครับ!', '🎯');
      return;
    }

    const idx     = closed[Math.floor(Math.random() * closed.length)];
    const tileNum = idx + 1;
    const tileEl  = document.getElementById(`tile-${tileNum}`);

    window.soundEngine.playDrumroll();

    if (tileEl) {
      tileEl.classList.add('picking');
      setTimeout(() => {
        tileEl.classList.remove('picking');
        this.openTile(idx);
        this.showToast(`🎲 สุ่มเปิดป้ายที่ ${tileNum}!`, '🎉');
      }, 580);
    } else {
      this.openTile(idx);
    }
  }

  // Reveal all tiles (wave cascade)
  revealAll() {
    window.soundEngine.playWhoosh();

    for (let i = 0; i < this.totalTiles; i++) {
      if (this.tileStates[i]) continue;
      this.tileStates[i] = true;

      setTimeout(() => {
        const tileEl = document.getElementById(`tile-${i + 1}`);
        if (!tileEl) return;
        tileEl.classList.add('opening');
        setTimeout(() => {
          tileEl.classList.remove('opening');
          tileEl.classList.add('opened');
          if (i % 6 === 0) window.soundEngine.playChime(1 + (i % 7) * 0.1);
        }, 320);
      }, i * 35);
    }

    setTimeout(() => {
      window.soundEngine.playFanfare();
      this.triggerConfetti();
      this.updateCounter();
      this.showToast('เฉลยภาพคำตอบเต็ม!', '👁️');
    }, this.totalTiles * 35 + 400);
  }

  // Hide all tiles (re-cover)
  hideAll() {
    window.soundEngine.playWhoosh();
    this.tileStates.fill(false);

    const tiles = document.querySelectorAll('.tile-item');
    tiles.forEach((tile, i) => {
      setTimeout(() => {
        tile.classList.remove('opened', 'opening');
      }, i * 12);
    });

    setTimeout(() => {
      this.updateCounter();
      this.showToast('ปิดแผ่นป้ายทั้งหมดแล้ว', '🙈');
    }, this.totalTiles * 12 + 60);
  }

  // ── Sound Toggle ──
  toggleSound() {
    const isEnabled = window.soundEngine.toggle();
    this._refreshSoundBtn(isEnabled);
    this.showToast(
      isEnabled ? 'เปิดเสียงเอฟเฟกต์แล้ว 🔊' : 'ปิดเสียงเอฟเฟกต์แล้ว 🔇',
      isEnabled ? '🔔' : '🔕'
    );
  }

  _refreshSoundBtn(isEnabled) {
    const btn      = document.getElementById('btnToggleSound');
    const iconOn   = document.getElementById('soundIconOn');
    const iconOff  = document.getElementById('soundIconOff');
    const label    = document.getElementById('soundLabel');

    if (!btn) return;

    if (isEnabled) {
      iconOn.style.display  = '';
      iconOff.style.display = 'none';
      label.textContent = 'เสียง: เปิด';
      btn.classList.remove('sound-off');
      btn.classList.add('sound-on');
    } else {
      iconOn.style.display  = 'none';
      iconOff.style.display = '';
      label.textContent = 'เสียง: ปิด';
      btn.classList.remove('sound-on');
      btn.classList.add('sound-off');
    }
  }

  // ── Fullscreen Toggle ──
  toggleFullscreen() {
    const fsExpand   = document.getElementById('fsIconExpand');
    const fsCompress = document.getElementById('fsIconCompress');
    const fsLabel    = document.getElementById('fsLabel');

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        fsExpand.style.display   = 'none';
        fsCompress.style.display = '';
        fsLabel.textContent = 'ออกเต็มจอ';
        this.showToast('โหมดเต็มหน้าจอ — พร้อมอัดคลิป!', '⛶');
      }).catch(() => {});
    } else {
      document.exitFullscreen && document.exitFullscreen().then(() => {
        fsExpand.style.display   = '';
        fsCompress.style.display = 'none';
        fsLabel.textContent = 'เต็มจอ';
      });
    }
  }

  // ── Studio Mode Toggle ──
  toggleStudioMode() {
    const isStudio = document.body.classList.toggle('studio-mode');
    this.showToast(
      isStudio ? 'โหมดถ่ายคลิป: เมนูถูกซ่อน (hover เพื่อใช้งาน)' : 'ออกจากโหมดถ่ายคลิปแล้ว',
      isStudio ? '🎬' : '🎥'
    );
  }

  // ══════════════════════════════════════════════════
  // UPLOAD MODAL
  // ══════════════════════════════════════════════════
  openUploadModal() {
    this.tempPreviewImage = this.currentAnswerImage;
    if (this.modalPreviewImg) this.modalPreviewImg.src = this.currentAnswerImage;
    this.uploadModal.classList.add('active');
  }

  closeUploadModal() {
    this.uploadModal.classList.remove('active');
  }

  async compressImage(file, maxDim = 1920) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
            else                { width = Math.round(width * maxDim / height); height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async handleAnswerFile(file) {
    if (!file) return;
    try {
      this.showToast('กำลังโหลดรูปภาพ...', '⏳');
      const dataUrl = await this.compressImage(file);
      this.tempPreviewImage = dataUrl;
      if (this.modalPreviewImg) this.modalPreviewImg.src = dataUrl;
      this.showToast('โหลดรูปสำเร็จ — กดบันทึกเพื่อเริ่มเล่น', '✅');
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    }
  }

  async saveAndApplyImage() {
    if (this.tempPreviewImage) {
      this.currentAnswerImage  = this.tempPreviewImage;
      this.answerImage.src     = this.currentAnswerImage;
      await window.imageStorage.saveMysteryImage(this.currentAnswerImage);
    }
    this.closeUploadModal();
    this.resetGame();
    this.showToast('บันทึกรูปคำตอบแล้ว พร้อมเล่น!', '✨');
  }

  async resetDefaultImage() {
    this.tempPreviewImage    = window.DEFAULT_MYSTERY_IMAGE;
    this.currentAnswerImage  = window.DEFAULT_MYSTERY_IMAGE;
    this.answerImage.src     = this.currentAnswerImage;
    if (this.modalPreviewImg) this.modalPreviewImg.src = this.currentAnswerImage;
    await window.imageStorage.clearMysteryImage();
    this.closeUploadModal();
    this.resetGame();
    this.showToast('คืนค่ารูปตัวอย่างแล้ว', '🔄');
  }

  // ══════════════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════════════
  showToast(text, icon = '✨') {
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this.toastText.textContent = text;
    this.toastIcon.textContent = icon;
    this.toastMsg.classList.add('show');
    this._toastTimeout = setTimeout(() => this.toastMsg.classList.remove('show'), 2800);
  }

  // ══════════════════════════════════════════════════
  // CONFETTI
  // ══════════════════════════════════════════════════
  setupConfettiCanvas() {
    const resize = () => {
      this.confettiCanvas.width  = window.innerWidth;
      this.confettiCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  triggerConfetti() {
    const colors = ['#ffcc00','#0056b3','#00d2ff','#ffffff','#ffe600','#ff0055','#22c55e'];
    this.confettiParticles = [];

    for (let i = 0; i < 160; i++) {
      this.confettiParticles.push({
        x:             window.innerWidth  * (0.3 + Math.random() * 0.4),
        y:             window.innerHeight * (0.3 + Math.random() * 0.3),
        vx:            (Math.random() * 2 - 1) * 16,
        vy:            (Math.random() * -14) - 4,
        size:          Math.random() * 10 + 5,
        color:         colors[Math.floor(Math.random() * colors.length)],
        rotation:      Math.random() * 360,
        rotationSpeed: (Math.random() * 2 - 1) * 10,
        gravity:       0.38,
        drag:          0.978,
        alpha:         1,
      });
    }

    if (!this.isConfettiRunning) {
      this.isConfettiRunning = true;
      this.animateConfetti();
    }
  }

  animateConfetti() {
    if (!this.isConfettiRunning) return;
    this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];
      p.x  += p.vx; p.y += p.vy; p.vy += p.gravity;
      p.vx *= p.drag; p.rotation += p.rotationSpeed; p.alpha -= 0.007;

      if (p.alpha <= 0 || p.y > window.innerHeight) { this.confettiParticles.splice(i, 1); continue; }

      this.confettiCtx.save();
      this.confettiCtx.translate(p.x, p.y);
      this.confettiCtx.rotate(p.rotation * Math.PI / 180);
      this.confettiCtx.globalAlpha = p.alpha;
      this.confettiCtx.fillStyle   = p.color;
      this.confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
      this.confettiCtx.restore();
    }

    if (this.confettiParticles.length > 0) {
      requestAnimationFrame(() => this.animateConfetti());
    } else {
      this.isConfettiRunning = false;
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
    }
  }

  // ══════════════════════════════════════════════════
  // EVENT BINDINGS
  // ══════════════════════════════════════════════════
  bindEvents() {
    // Toolbar
    document.getElementById('btnManageImages').addEventListener('click', () => this.openUploadModal());
    document.getElementById('btnResetGame').addEventListener('click',    () => this.resetGame());
    document.getElementById('btnRandomPick').addEventListener('click',   () => this.pickRandomTile());
    document.getElementById('btnRevealAll').addEventListener('click',    () => this.revealAll());
    document.getElementById('btnToggleSound').addEventListener('click',  () => this.toggleSound());
    document.getElementById('btnFullscreen').addEventListener('click',   () => this.toggleFullscreen());
    document.getElementById('btnStudioMode').addEventListener('click',   () => this.toggleStudioMode());
    document.getElementById('studioIndicator').addEventListener('click', () => this.toggleStudioMode());

    // Host soundboard
    document.getElementById('btnSbCorrect').addEventListener('click', () => {
      window.soundEngine.playCorrect();
      this.showToast('ถูกต้อง! Ding-Dong! 🔔', '✅');
    });
    document.getElementById('btnSbWrong').addEventListener('click', () => {
      window.soundEngine.playWrong();
      this.showToast('ตอบผิดครับ! ❌', '🚫');
    });
    document.getElementById('btnSbDrum').addEventListener('click', () => {
      window.soundEngine.playDrumroll();
      this.showToast('ลุ้นระทึก... 🥁', '⚡');
    });

    // Modal
    document.getElementById('btnCloseModal').addEventListener('click',        () => this.closeUploadModal());
    document.getElementById('btnSaveAndClose').addEventListener('click',      () => this.saveAndApplyImage());
    document.getElementById('btnResetDefaultImage').addEventListener('click', () => this.resetDefaultImage());
    this.uploadModal.addEventListener('click', e => {
      if (e.target === this.uploadModal) this.closeUploadModal();
    });

    // Image fit radio
    document.querySelectorAll('input[name="imageFit"]').forEach(r => {
      r.addEventListener('change', e => {
        this.answerImage.style.objectFit = e.target.value;
        localStorage.setItem('advice_image_fit', e.target.value);
      });
    });

    // Dropzone
    const dropzone  = document.getElementById('answerDropzone');
    const fileInput = document.getElementById('answerFileInput');

    dropzone.addEventListener('click',     () => fileInput.click());
    dropzone.addEventListener('dragover',  e  => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', ()  => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop',      e  => {
      e.preventDefault(); dropzone.classList.remove('dragover');
      if (e.dataTransfer.files?.[0]) this.handleAnswerFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => {
      if (e.target.files?.[0]) this.handleAnswerFile(e.target.files[0]);
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.closeUploadModal(); return; }
      if (this.uploadModal.classList.contains('active')) return;

      const noMod = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!noMod) return;

      switch (e.key.toLowerCase()) {
        case 'f': e.preventDefault(); this.toggleFullscreen();  break;
        case 'm': e.preventDefault(); this.toggleSound();       break;
        case 'r': e.preventDefault(); this.resetGame();         break;
        case 'q': e.preventDefault(); this.pickRandomTile();    break;
        case 'z': case '1':
          e.preventDefault();
          window.soundEngine.playCorrect();
          this.showToast('ถูกต้อง! Ding-Dong! 🔔', '✅');
          break;
        case 'x': case '2':
          e.preventDefault();
          window.soundEngine.playWrong();
          this.showToast('ตอบผิดครับ! ❌', '🚫');
          break;
        case 'c': case '3':
          e.preventDefault();
          window.soundEngine.playDrumroll();
          this.showToast('ลุ้นระทึก... 🥁', '⚡');
          break;
      }
    });
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.adviceApp = new AdviceMysteryGame();
});
