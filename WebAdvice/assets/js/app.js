/**
 * ADVICE อ่างทอง — เกมเปิดแผ่นป้ายทายภาพ
 * 1 รูปภาพคำตอบซ่อนหลัง 35 ป้าย (5 แถว × 7 คอลัมน์)
 */

class AdviceMysteryGame {
  constructor() {
    this.totalTiles = 35;
    this.tileStates = new Array(this.totalTiles).fill(false);
    this.currentAnswerImage = null;
    this.tempPreviewImage = null;

    // จัดการ Timer ป้องกันคำสั่งซ้อนกัน
    this.operationId = 0;
    this.pendingTimers = new Set();
    this._toastTimeout = null;

    // DOM refs
    this.tilesGrid = document.getElementById('tilesGrid');
    this.answerImage = document.getElementById('answerImage');
    this.openedCountElem = document.getElementById('openedCount');
    this.uploadModal = document.getElementById('uploadModal');
    this.modalPreviewImg = document.getElementById('modalPreviewImg');
    this.toastMsg = document.getElementById('toastMsg');
    this.toastText = document.getElementById('toastText');
    this.toastIcon = document.getElementById('toastIcon');
    this.confettiCanvas = document.getElementById('confettiCanvas');
    this.confettiCtx = this.confettiCanvas
      ? this.confettiCanvas.getContext('2d')
      : null;

    this.confettiParticles = [];
    this.isConfettiRunning = false;

    this.init();
  }

  // ══════════════════════════════════════════════════
  // TIMER MANAGEMENT
  // ══════════════════════════════════════════════════

  cancelPendingOperations() {
    this.operationId++;

    this.pendingTimers.forEach(timer => clearTimeout(timer));
    this.pendingTimers.clear();

    return this.operationId;
  }

  safeTimeout(callback, delay, operationId = this.operationId) {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);

      if (operationId !== this.operationId) return;

      callback();
    }, delay);

    this.pendingTimers.add(timer);
    return timer;
  }

  playSound(method, ...args) {
    if (
      window.soundEngine &&
      typeof window.soundEngine[method] === 'function'
    ) {
      window.soundEngine[method](...args);
    }
  }

  // ══════════════════════════════════════════════════
  // INITIALIZE
  // ══════════════════════════════════════════════════

  async init() {
    this.setupConfettiCanvas();
    this.bindEvents();

    await this.loadAnswerImage();

    this.renderTiles();
    this.updateCounter();

    // Unlock Web Audio on first gesture
    const unlockAudio = () => {
      if (window.soundEngine && typeof window.soundEngine.init === 'function') {
        window.soundEngine.init();
      }

      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    this._refreshSoundBtn(
      window.soundEngine ? window.soundEngine.enabled !== false : true
    );
  }

  // ══════════════════════════════════════════════════
  // LOAD & SAVE ANSWER IMAGE
  // ══════════════════════════════════════════════════

  async loadAnswerImage() {
    let saved = null;

    try {
      if (
        window.imageStorage &&
        typeof window.imageStorage.getMysteryImage === 'function'
      ) {
        saved = await window.imageStorage.getMysteryImage();
      }
    } catch (err) {
      console.error('ไม่สามารถโหลดรูปภาพที่บันทึกไว้ได้:', err);
    }

    this.currentAnswerImage =
      saved || window.DEFAULT_MYSTERY_IMAGE || '';

    const fitMode = localStorage.getItem('advice_image_fit') || 'cover';

    if (this.answerImage) {
      this.answerImage.style.objectFit = fitMode;
      this.answerImage.src = this.currentAnswerImage;
    }

    const fitCoverRadio = document.getElementById('fitCover');
    const fitContainRadio = document.getElementById('fitContain');

    if (fitCoverRadio && fitContainRadio) {
      (fitMode === 'contain' ? fitContainRadio : fitCoverRadio).checked = true;
    }

    if (this.modalPreviewImg) {
      this.modalPreviewImg.src = this.currentAnswerImage;
    }
  }

  // ══════════════════════════════════════════════════
  // RENDER 35 TILES
  // ══════════════════════════════════════════════════

  renderTiles() {
    if (!this.tilesGrid) return;

    this.tilesGrid.innerHTML = '';

    for (let i = 1; i <= this.totalTiles; i++) {
      const tile = document.createElement('div');

      tile.className = `tile-item${this.tileStates[i - 1] ? ' opened' : ''}`;
      tile.id = `tile-${i}`;
      tile.dataset.number = i;

      tile.setAttribute('tabindex', '0');
      tile.setAttribute('role', 'button');
      tile.setAttribute('aria-label', `แผ่นป้ายที่ ${i}`);

      tile.style.setProperty('--tile-i', i);

      tile.innerHTML = `
        <span class="tile-advice-mini">ADVICE</span>
        <div class="tile-corner-tr"></div>
        <div class="tile-corner-bl"></div>
        <span class="tile-number">${i}</span>
      `;

      tile.addEventListener('click', () => {
        this.openTile(i - 1);
      });

      tile.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openTile(i - 1);
        }
      });

      this.tilesGrid.appendChild(tile);
    }
  }

  // ══════════════════════════════════════════════════
  // OPEN A TILE
  // ══════════════════════════════════════════════════

  openTile(index) {
    if (index < 0 || index >= this.totalTiles) return;
    if (this.tileStates[index]) return;

    this.tileStates[index] = true;

    const tileElem = document.getElementById(`tile-${index + 1}`);

    if (tileElem) {
      tileElem.classList.add('opening');

      this.safeTimeout(() => {
        tileElem.classList.remove('opening');
        tileElem.classList.add('opened');
      }, 400);
    }

    this.playSound('playFlip');
    this.playSound('playChime', 1 + (index % 7) * 0.08);

    this.updateCounter(true);

    const opened = this.tileStates.filter(Boolean).length;

    if (opened === this.totalTiles) {
      const currentOperation = this.operationId;

      this.safeTimeout(() => {
        this.playSound('playFanfare');
        this.triggerConfetti();
        this.showToast('🎉 เฉลยครบทั้ง 35 ป้ายแล้ว!', '🏆');
      }, 500, currentOperation);
    }
  }

  // ══════════════════════════════════════════════════
  // UPDATE COUNTER
  // ══════════════════════════════════════════════════

  updateCounter(bump = false) {
    const opened = this.tileStates.filter(Boolean).length;

    if (this.openedCountElem) {
      this.openedCountElem.textContent = opened;

      if (bump) {
        this.openedCountElem.classList.remove('bump');
        void this.openedCountElem.offsetWidth;
        this.openedCountElem.classList.add('bump');
      } else {
        this.openedCountElem.classList.remove('bump');
      }
    }

    const pct = (opened / this.totalTiles) * 100;
    const bar = document.getElementById('progressFill');

    if (bar) {
      bar.style.width = pct + '%';
      bar.style.opacity = opened === 0 ? '0' : '1';

      if (opened === this.totalTiles) {
        bar.classList.add('complete');
      } else {
        bar.classList.remove('complete');
      }
    }
  }

  // ══════════════════════════════════════════════════
  // GAME CONTROLS
  // ══════════════════════════════════════════════════

  // Reset — close all tiles
  resetGame() {
    const operationId = this.cancelPendingOperations();

    this.playSound('playWhoosh');
    this.tileStates.fill(false);

    const tiles = document.querySelectorAll('.tile-item');

    tiles.forEach((tile, i) => {
      this.safeTimeout(() => {
        tile.classList.remove('opened', 'opening', 'picking');
      }, i * 12, operationId);
    });

    this.updateCounter(false);

    this.showToast('เริ่มเกมใหม่แล้ว ปิดป้ายทั้ง 35 ช่อง', '🔄');
  }

  // Random pick 1 closed tile
  pickRandomTile() {
    const closed = this.tileStates
      .map((value, index) => (!value ? index : -1))
      .filter(index => index !== -1);

    if (closed.length === 0) {
      this.showToast('เปิดครบทั้ง 35 ป้ายแล้วครับ!', '🎯');
      return;
    }

    const idx = closed[Math.floor(Math.random() * closed.length)];
    const tileNum = idx + 1;
    const tileEl = document.getElementById(`tile-${tileNum}`);

    const operationId = this.operationId;

    this.playSound('playDrumroll');

    if (tileEl) {
      tileEl.classList.add('picking');

      this.safeTimeout(() => {
        tileEl.classList.remove('picking');

        this.openTile(idx);
        this.showToast(`🎲 สุ่มเปิดป้ายที่ ${tileNum}!`, '🎉');
      }, 600, operationId);
    } else {
      this.openTile(idx);
    }
  }

  // Reveal all tiles
  revealAll() {
    const operationId = this.cancelPendingOperations();

    this.playSound('playWhoosh');

    let delay = 0;

    for (let i = 0; i < this.totalTiles; i++) {
      if (this.tileStates[i]) continue;

      this.tileStates[i] = true;

      const capturedDelay = delay;
      const capturedIndex = i;

      this.safeTimeout(() => {
        const tileEl = document.getElementById(
          `tile-${capturedIndex + 1}`
        );

        if (!tileEl) return;

        tileEl.classList.add('opening');

        this.safeTimeout(() => {
          tileEl.classList.remove('opening');
          tileEl.classList.add('opened');

          if (capturedIndex % 6 === 0) {
            this.playSound(
              'playChime',
              1 + (capturedIndex % 7) * 0.1
            );
          }
        }, 400, operationId);

      }, capturedDelay * 35, operationId);

      delay++;
    }

    this.updateCounter(false);

    const totalDelay = delay * 35 + 500;

    this.safeTimeout(() => {
      this.playSound('playFanfare');
      this.triggerConfetti();
      this.showToast('เฉลยภาพคำตอบเต็ม!', '👁️');
    }, totalDelay, operationId);
  }

  // Hide all tiles
  hideAll() {
    const operationId = this.cancelPendingOperations();

    this.playSound('playWhoosh');

    this.tileStates.fill(false);

    const tiles = document.querySelectorAll('.tile-item');

    tiles.forEach((tile, i) => {
      this.safeTimeout(() => {
        tile.classList.remove('opened', 'opening', 'picking');
      }, i * 12, operationId);
    });

    this.safeTimeout(() => {
      this.updateCounter(false);
      this.showToast('ปิดแผ่นป้ายทั้งหมดแล้ว', '🙈');
    }, this.totalTiles * 12 + 60, operationId);
  }

  // ══════════════════════════════════════════════════
  // SOUND
  // ══════════════════════════════════════════════════

  toggleSound() {
    if (
      !window.soundEngine ||
      typeof window.soundEngine.toggle !== 'function'
    ) {
      this.showToast('ระบบเสียงยังไม่พร้อมใช้งาน', '⚠️');
      return;
    }

    const isEnabled = window.soundEngine.toggle();

    this._refreshSoundBtn(isEnabled);

    this.showToast(
      isEnabled ? 'เปิดเสียงเอฟเฟกต์แล้ว 🔊' : 'ปิดเสียงเอฟเฟกต์แล้ว 🔇',
      isEnabled ? '🔔' : '🔕'
    );
  }

  _refreshSoundBtn(isEnabled) {
    const btn = document.getElementById('btnToggleSound');
    const iconOn = document.getElementById('soundIconOn');
    const iconOff = document.getElementById('soundIconOff');
    const label = document.getElementById('soundLabel');

    if (!btn) return;

    if (iconOn) iconOn.style.display = isEnabled ? '' : 'none';
    if (iconOff) iconOff.style.display = isEnabled ? 'none' : '';

    if (label) {
      label.textContent = isEnabled ? 'เสียง: เปิด' : 'เสียง: ปิด';
    }

    btn.classList.toggle('sound-on', isEnabled);
    btn.classList.toggle('sound-off', !isEnabled);
  }

  // ══════════════════════════════════════════════════
  // FULLSCREEN
  // ══════════════════════════════════════════════════

  toggleFullscreen() {
    const fsExpand = document.getElementById('fsIconExpand');
    const fsCompress = document.getElementById('fsIconCompress');
    const fsLabel = document.getElementById('fsLabel');

    if (!document.fullscreenElement) {
      if (!document.documentElement.requestFullscreen) return;

      document.documentElement.requestFullscreen()
        .then(() => {
          if (fsExpand) fsExpand.style.display = 'none';
          if (fsCompress) fsCompress.style.display = '';
          if (fsLabel) fsLabel.textContent = 'ออกเต็มจอ';

          this.showToast('โหมดเต็มหน้าจอ — พร้อมอัดคลิป!', '⛶');
        })
        .catch(err => {
          console.error('Fullscreen error:', err);
        });

    } else if (document.exitFullscreen) {
      document.exitFullscreen()
        .then(() => {
          if (fsExpand) fsExpand.style.display = '';
          if (fsCompress) fsCompress.style.display = 'none';
          if (fsLabel) fsLabel.textContent = 'เต็มจอ';
        })
        .catch(err => {
          console.error('Exit fullscreen error:', err);
        });
    }
  }

  // ══════════════════════════════════════════════════
  // STUDIO MODE
  // ══════════════════════════════════════════════════

  toggleStudioMode() {
    const isStudio = document.body.classList.toggle('studio-mode');

    this.showToast(
      isStudio
        ? 'โหมดถ่ายคลิป: เมนูถูกซ่อน (hover เพื่อใช้งาน)'
        : 'ออกจากโหมดถ่ายคลิปแล้ว',
      isStudio ? '🎬' : '🎥'
    );
  }

  // ══════════════════════════════════════════════════
  // UPLOAD MODAL
  // ══════════════════════════════════════════════════

  openUploadModal() {
    if (!this.uploadModal) return;

    this.tempPreviewImage = this.currentAnswerImage;

    if (this.modalPreviewImg) {
      this.modalPreviewImg.src = this.currentAnswerImage;
    }

    this.uploadModal.classList.add('active');
  }

  closeUploadModal() {
    if (this.uploadModal) {
      this.uploadModal.classList.remove('active');
    }
  }

  // ══════════════════════════════════════════════════
  // IMAGE COMPRESSION
  // ══════════════════════════════════════════════════

  async compressImage(file, maxDim = 1920) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        const img = new Image();

        img.onload = () => {
          let { width, height } = img;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round(height * maxDim / width);
              width = maxDim;
            } else {
              width = Math.round(width * maxDim / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('ไม่สามารถสร้าง Canvas ได้'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };

        img.onerror = () => {
          reject(new Error('ไม่สามารถอ่านรูปภาพได้'));
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
      };

      reader.readAsDataURL(file);
    });
  }

  // ══════════════════════════════════════════════════
  // HANDLE ANSWER FILE
  // ══════════════════════════════════════════════════

  async handleAnswerFile(file) {
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      this.showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', '⚠️');
      return;
    }

    try {
      this.showToast('กำลังโหลดรูปภาพ...', '⏳');

      const dataUrl = await this.compressImage(file);

      this.tempPreviewImage = dataUrl;

      if (this.modalPreviewImg) {
        this.modalPreviewImg.src = dataUrl;
      }

      this.showToast(
        'โหลดรูปสำเร็จ — กดบันทึกเพื่อเริ่มเล่น',
        '✅'
      );

    } catch (err) {
      console.error(err);
      this.showToast('ไม่สามารถโหลดรูปภาพได้ กรุณาลองใหม่', '❌');
    }
  }

  // ══════════════════════════════════════════════════
  // SAVE IMAGE
  // ══════════════════════════════════════════════════

  async saveAndApplyImage() {
    if (this.tempPreviewImage) {
      this.currentAnswerImage = this.tempPreviewImage;

      if (this.answerImage) {
        this.answerImage.src = this.currentAnswerImage;
      }

      try {
        if (
          window.imageStorage &&
          typeof window.imageStorage.saveMysteryImage === 'function'
        ) {
          await window.imageStorage.saveMysteryImage(
            this.currentAnswerImage
          );
        }
      } catch (err) {
        console.error('ไม่สามารถบันทึกรูปภาพได้:', err);
        this.showToast('บันทึกรูปภาพไม่สำเร็จ', '❌');
        return;
      }
    }

    this.closeUploadModal();
    this.resetGame();

    this.showToast('บันทึกรูปคำตอบแล้ว พร้อมเล่น!', '✨');
  }

  // ══════════════════════════════════════════════════
  // RESET DEFAULT IMAGE
  // ══════════════════════════════════════════════════

  async resetDefaultImage() {
    this.tempPreviewImage = window.DEFAULT_MYSTERY_IMAGE;
    this.currentAnswerImage = window.DEFAULT_MYSTERY_IMAGE;

    if (this.answerImage) {
      this.answerImage.src = this.currentAnswerImage;
    }

    if (this.modalPreviewImg) {
      this.modalPreviewImg.src = this.currentAnswerImage;
    }

    try {
      if (
        window.imageStorage &&
        typeof window.imageStorage.clearMysteryImage === 'function'
      ) {
        await window.imageStorage.clearMysteryImage();
      }
    } catch (err) {
      console.error('ไม่สามารถคืนค่ารูปภาพได้:', err);
      this.showToast('คืนค่ารูปภาพไม่สำเร็จ', '❌');
      return;
    }

    this.closeUploadModal();
    this.resetGame();

    this.showToast('คืนค่ารูปตัวอย่างแล้ว', '🔄');
  }

  // ══════════════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════════════

  showToast(text, icon = '✨') {
    if (!this.toastMsg || !this.toastText || !this.toastIcon) return;

    if (this._toastTimeout) {
      clearTimeout(this._toastTimeout);
    }

    this.toastText.textContent = text;
    this.toastIcon.textContent = icon;

    this.toastMsg.classList.add('show');

    this._toastTimeout = setTimeout(() => {
      this.toastMsg.classList.remove('show');
      this._toastTimeout = null;
    }, 2800);
  }

  // ══════════════════════════════════════════════════
  // CONFETTI
  // ══════════════════════════════════════════════════

  setupConfettiCanvas() {
    if (!this.confettiCanvas) return;

    const resize = () => {
      this.confettiCanvas.width = window.innerWidth;
      this.confettiCanvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();
  }

  triggerConfetti() {
    if (!this.confettiCtx || !this.confettiCanvas) return;

    const colors = [
      '#ffcc00',
      '#0056b3',
      '#00d2ff',
      '#ffffff',
      '#ffe600',
      '#ff0055',
      '#22c55e'
    ];

    this.confettiParticles = [];

    for (let i = 0; i < 160; i++) {
      this.confettiParticles.push({
        x: window.innerWidth * (0.3 + Math.random() * 0.4),
        y: window.innerHeight * (0.3 + Math.random() * 0.3),
        vx: (Math.random() * 2 - 1) * 16,
        vy: (Math.random() * -14) - 4,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() * 2 - 1) * 10,
        gravity: 0.38,
        drag: 0.978,
        alpha: 1
      });
    }

    if (!this.isConfettiRunning) {
      this.isConfettiRunning = true;
      this.animateConfetti();
    }
  }

  animateConfetti() {
    if (!this.isConfettiRunning || !this.confettiCtx) return;

    this.confettiCtx.clearRect(
      0,
      0,
      this.confettiCanvas.width,
      this.confettiCanvas.height
    );

    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;

      p.vx *= p.drag;
      p.rotation += p.rotationSpeed;
      p.alpha -= 0.007;

      if (p.alpha <= 0 || p.y > window.innerHeight) {
        this.confettiParticles.splice(i, 1);
        continue;
      }

      this.confettiCtx.save();

      this.confettiCtx.translate(p.x, p.y);
      this.confettiCtx.rotate(p.rotation * Math.PI / 180);
      this.confettiCtx.globalAlpha = p.alpha;
      this.confettiCtx.fillStyle = p.color;

      this.confettiCtx.fillRect(
        -p.size / 2,
        -p.size / 2,
        p.size,
        p.size * 0.55
      );

      this.confettiCtx.restore();
    }

    if (this.confettiParticles.length > 0) {
      requestAnimationFrame(() => this.animateConfetti());
    } else {
      this.isConfettiRunning = false;

      this.confettiCtx.clearRect(
        0,
        0,
        this.confettiCanvas.width,
        this.confettiCanvas.height
      );
    }
  }

  // ══════════════════════════════════════════════════
  // EVENT BINDINGS
  // ══════════════════════════════════════════════════

  bindEvents() {
    const onClick = (id, callback) => {
      const element = document.getElementById(id);

      if (element) {
        element.addEventListener('click', callback);
      }
    };

    // Toolbar
    onClick('btnManageImages', () => this.openUploadModal());
    onClick('btnResetGame', () => this.resetGame());
    onClick('btnRandomPick', () => this.pickRandomTile());
    onClick('btnRevealAll', () => this.revealAll());
    onClick('btnHideAll', () => this.hideAll());
    onClick('btnToggleSound', () => this.toggleSound());
    onClick('btnFullscreen', () => this.toggleFullscreen());
    onClick('btnStudioMode', () => this.toggleStudioMode());
    onClick('studioIndicator', () => this.toggleStudioMode());

    // Host soundboard
    onClick('btnSbCorrect', () => {
      this.playSound('playCorrect');
      this.showToast('ถูกต้อง! Ding-Dong! 🔔', '✅');
    });

    onClick('btnSbWrong', () => {
      this.playSound('playWrong');
      this.showToast('ตอบผิดครับ! ❌', '🚫');
    });

    onClick('btnSbDrum', () => {
      this.playSound('playDrumroll');
      this.showToast('ลุ้นระทึก... 🥁', '⚡');
    });

    // Modal
    onClick('btnCloseModal', () => this.closeUploadModal());
    onClick('btnSaveAndClose', () => this.saveAndApplyImage());
    onClick('btnResetDefaultImage', () => this.resetDefaultImage());

    if (this.uploadModal) {
      this.uploadModal.addEventListener('click', e => {
        if (e.target === this.uploadModal) {
          this.closeUploadModal();
        }
      });
    }

    // Image fit radio
    document.querySelectorAll('input[name="imageFit"]').forEach(radio => {
      radio.addEventListener('change', e => {
        if (this.answerImage) {
          this.answerImage.style.objectFit = e.target.value;
        }

        localStorage.setItem('advice_image_fit', e.target.value);
      });
    });

    // Dropzone
    const dropzone = document.getElementById('answerDropzone');
    const fileInput = document.getElementById('answerFileInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', e => {
        e.preventDefault();

        dropzone.classList.remove('dragover');

        if (e.dataTransfer.files?.[0]) {
          this.handleAnswerFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', e => {
        if (e.target.files?.[0]) {
          this.handleAnswerFile(e.target.files[0]);
        }

        // เลือกไฟล์เดิมซ้ำได้
        e.target.value = '';
      });
    }

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.closeUploadModal();
        return;
      }

      if (
        this.uploadModal &&
        this.uploadModal.classList.contains('active')
      ) {
        return;
      }

      // ไม่ทำงานเมื่อกำลังพิมพ์ข้อความ
      const target = e.target;

      if (
        target &&
        (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        )
      ) {
        return;
      }

      const noMod = !e.ctrlKey && !e.metaKey && !e.altKey;

      if (!noMod) return;

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          this.toggleFullscreen();
          break;

        case 'm':
          e.preventDefault();
          this.toggleSound();
          break;

        case 'r':
          e.preventDefault();
          this.resetGame();
          break;

        case 'q':
          e.preventDefault();
          this.pickRandomTile();
          break;

        case 'z':
        case '1':
          e.preventDefault();
          this.playSound('playCorrect');
          this.showToast('ถูกต้อง! Ding-Dong! 🔔', '✅');
          break;

        case 'x':
        case '2':
          e.preventDefault();
          this.playSound('playWrong');
          this.showToast('ตอบผิดครับ! ❌', '🚫');
          break;

        case 'c':
        case '3':
          e.preventDefault();
          this.playSound('playDrumroll');
          this.showToast('ลุ้นระทึก... 🥁', '⚡');
          break;
      }
    });
  }
}

// ══════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  window.adviceApp = new AdviceMysteryGame();
});
