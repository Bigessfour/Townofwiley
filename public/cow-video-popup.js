(function loadCowVideoPopup() {
  const currentScript = document.currentScript;

  if (!currentScript || document.getElementById('tow-cow-video-popup')) {
    return;
  }

  const storageKey = currentScript.dataset.storageKey || 'towCowPopupSeen';
  const fallbackVideoSrc = currentScript.dataset.videoSrc || '/videos/cow-welcome.mp4';
  const videoPosterSrc = currentScript.dataset.videoPosterSrc || '';
  const buttonPosition = currentScript.dataset.buttonPosition || 'bottom-right';
  const delayMs = Number.parseInt(currentScript.dataset.delayMs || '300', 10);
  const autoHideMs = Number.parseInt(currentScript.dataset.autoHideMs || '4200', 10);
  const bubbleText = currentScript.dataset.bubbleText || "I'm Wylie. Tap the chat bubble if you'd like a hand.";
  const rawVideoSources = [
    {
      src: currentScript.dataset.videoWebmSrc || '',
      type: currentScript.dataset.videoWebmType || 'video/webm',
    },
    {
      src: currentScript.dataset.videoMp4Src || fallbackVideoSrc,
      type: currentScript.dataset.videoMp4Type || 'video/mp4',
    },
  ].filter(function (source) {
    return Boolean(source.src);
  });
  const videoSources = rawVideoSources.filter(function (source, index) {
    return (
      rawVideoSources.findIndex(function (candidate) {
        return candidate.src === source.src && candidate.type === source.type;
      }) === index
    );
  });

  const hasSeenPopup = function () {
    try {
      return window.localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  };

  const markSeen = function () {
    try {
      window.localStorage.setItem(storageKey, 'true');
    } catch {
      // Ignore storage failures so the popup can still be shown.
    }
  };

  const ensureStyles = function () {
    if (document.getElementById('tow-cow-video-popup-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'tow-cow-video-popup-styles';
    styles.textContent = `
      @keyframes towCowPopupIn {
        from { opacity: 0; transform: translateY(1rem) scale(0.92); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      #tow-cow-video-popup {
        position: fixed;
        bottom: 5.75rem;
        z-index: 9999;
        width: max-content;
        max-width: calc(100vw - 1rem);
        animation: towCowPopupIn 320ms cubic-bezier(0.22, 1, 0.36, 1);
        transition: opacity 180ms ease, transform 180ms ease;
        pointer-events: none;
      }

      #tow-cow-video-popup[data-position="bottom-right"] {
        right: 1rem;
      }

      #tow-cow-video-popup[data-position="bottom-left"] {
        left: 1rem;
      }

      #tow-cow-video-popup.is-closing {
        opacity: 0;
        transform: translateY(0.75rem) scale(0.96);
      }

      .tow-cow-video-popup__card {
        position: relative;
        display: inline-flex;
        align-items: flex-end;
        justify-content: center;
        overflow: visible;
        background: transparent;
        box-shadow: none;
        pointer-events: none;
      }

      .tow-cow-video-popup__video {
        display: block;
        width: auto;
        height: 2in;
        max-width: calc(100vw - 1.5rem);
        max-height: calc(100vh - 2rem);
        object-fit: contain;
        background: transparent;
        filter: drop-shadow(0 0.2rem 0.55rem rgba(55, 34, 11, 0.12));
        pointer-events: none;
      }

      .tow-cow-video-popup__bubble {
        position: absolute;
        bottom: calc(100% - 1rem);
        left: 50%;
        transform: translateX(-50%);
        max-width: min(12.5rem, calc(100vw - 2rem));
        border: 1px solid rgba(79, 55, 24, 0.12);
        border-radius: 1rem;
        background: rgba(255, 250, 244, 0.88);
        color: #4a3723;
        padding: 0.45rem 0.7rem;
        backdrop-filter: blur(6px);
        font-family: "Source Sans 3", Arial, sans-serif;
        font-size: 0.77rem;
        font-weight: 650;
        line-height: 1.2;
        text-align: center;
        box-shadow: 0 0.18rem 0.5rem rgba(55, 34, 11, 0.08);
        pointer-events: none;
      }

      .tow-cow-video-popup__bubble::after {
        content: "";
        position: absolute;
        left: 50%;
        top: calc(100% - 0.1rem);
        width: 0.62rem;
        height: 0.62rem;
        background: rgba(255, 250, 244, 0.88);
        transform: translateX(-50%) rotate(45deg);
        box-shadow: 0.1rem 0.1rem 0.2rem rgba(55, 34, 11, 0.05);
      }

      .tow-cow-video-popup__close {
        position: absolute;
        top: -0.3rem;
        right: -0.15rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.1rem;
        height: 1.1rem;
        border: 1px solid rgba(79, 55, 24, 0.14);
        border-radius: 999px;
        background: rgba(255, 250, 244, 0.82);
        color: #5a4127;
        font: inherit;
        font-size: 0.78rem;
        cursor: pointer;
        box-shadow: 0 0.15rem 0.35rem rgba(55, 34, 11, 0.08);
        pointer-events: auto;
      }

      .tow-cow-video-popup__close:focus-visible {
        outline: 2px solid rgba(90, 65, 39, 0.4);
        outline-offset: 2px;
      }

      @media (min-width: 640px) {
        #tow-cow-video-popup {
          bottom: 6.25rem;
        }

        #tow-cow-video-popup[data-position="bottom-right"] {
          right: 4.6rem;
        }

        #tow-cow-video-popup[data-position="bottom-left"] {
          left: 4.6rem;
        }

        .tow-cow-video-popup__bubble {
          font-size: 0.8rem;
        }
      }

      @media (max-width: 639px) {
        .tow-cow-video-popup__video {
          height: min(1.6in, 24vw);
        }

        .tow-cow-video-popup__bubble {
          max-width: min(10.5rem, calc(100vw - 1rem));
          font-size: 0.72rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #tow-cow-video-popup {
          animation: none;
          transition: none;
        }
      }
    `;

    document.head.appendChild(styles);
  };

  const closePopup = function (popup, shouldMarkSeen) {
    if (!popup) {
      return;
    }

    if (shouldMarkSeen) {
      markSeen();
    }

    popup.classList.add('is-closing');

    window.setTimeout(function () {
      popup.remove();
    }, 180);
  };

  const buildPopup = function () {
    const popup = document.createElement('section');
    const card = document.createElement('div');
    const bubble = document.createElement('p');
    const video = document.createElement('video');
    const closeButton = document.createElement('button');

    popup.id = 'tow-cow-video-popup';
    popup.dataset.position = buttonPosition === 'bottom-left' ? 'bottom-left' : 'bottom-right';
    popup.setAttribute('aria-label', 'Town of Wiley assistant welcome');

    card.className = 'tow-cow-video-popup__card';

    bubble.className = 'tow-cow-video-popup__bubble';
    bubble.textContent = bubbleText;

    video.className = 'tow-cow-video-popup__video';
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');

    if (videoPosterSrc) {
      video.poster = videoPosterSrc;
    }

    videoSources.forEach(function (sourceConfig) {
      const source = document.createElement('source');

      source.src = sourceConfig.src;
      source.type = sourceConfig.type;
      video.appendChild(source);
    });

    closeButton.className = 'tow-cow-video-popup__close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Dismiss welcome popup');
    closeButton.textContent = '×';

    card.appendChild(bubble);
    card.appendChild(video);
    card.appendChild(closeButton);
    popup.appendChild(card);

    let hasClosed = false;
    const hideTimer = window.setTimeout(function () {
      if (hasClosed) {
        return;
      }

      hasClosed = true;
      closePopup(popup, true);
    }, autoHideMs);

    closeButton.addEventListener('click', function () {
      if (hasClosed) {
        return;
      }

      hasClosed = true;
      window.clearTimeout(hideTimer);
      closePopup(popup, true);
    });

    video.addEventListener('ended', function () {
      if (hasClosed) {
        return;
      }

      hasClosed = true;
      window.clearTimeout(hideTimer);
      closePopup(popup, true);
    });

    video.addEventListener('error', function () {
      if (hasClosed) {
        return;
      }

      hasClosed = true;
      window.clearTimeout(hideTimer);
      closePopup(popup, false);
    });

    return popup;
  };

  const showPopup = function () {
    if (hasSeenPopup() || document.getElementById('tow-cow-video-popup')) {
      return;
    }

    ensureStyles();
    markSeen();
    document.body.appendChild(buildPopup());
  };

  if (hasSeenPopup()) {
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        window.setTimeout(showPopup, Math.max(0, delayMs));
      },
      { once: true },
    );

    return;
  }

  window.setTimeout(showPopup, Math.max(0, delayMs));
})();
