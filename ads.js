let adsManager;
let adsLoader;
let adDisplayContainer;
let adsInitialized;
let width;
let height;
let audioContext;
let isUserInteracted = false;

/**
 * Initializes IMA setup.
 */
function init() {
  // Mostrar botón de play
  document.getElementById('playButton').style.display = 'block';
  
  // Configurar listeners de interacción
  setupInteractionListeners();
  
  // Intentar inicializar audio context
  tryInitAudioContext();
}

/**
 * Sets up interaction listeners.
 */
function setupInteractionListeners() {
  const playButton = document.getElementById('playButton');
  const unmuteButton = document.getElementById('unmuteButton');
  
  playButton.addEventListener('click', function() {
    isUserInteracted = true;
    this.style.display = 'none';
    setUpIMA();
  });
  
  unmuteButton.addEventListener('click', function() {
    if (adsManager) {
      const currentVolume = adsManager.getVolume();
      adsManager.setVolume(currentVolume > 0 ? 0 : 1);
      this.querySelector('path:last-child').style.display = currentVolume > 0 ? 'block' : 'none';
    }
  });
}

/**
 * Tries to initialize audio context.
 */
function tryInitAudioContext() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // En algunos navegadores necesitamos "resumir" el contexto después de una interacción
    if (audioContext.state === 'suspended') {
      document.addEventListener('click', function resumeAudio() {
        audioContext.resume().then(() => {
          document.removeEventListener('click', resumeAudio);
        });
      }, { once: true });
    }
  } catch (e) {
    console.log('AudioContext no soportado:', e);
  }
}

/**
 * Sets up IMA ad display container, ads loader, and makes an ad request.
 */
function setUpIMA() {
  // Create the ad display container.
  createAdDisplayContainer();
 
  // Create ads loader.
  adsLoader = new google.ima.AdsLoader(adDisplayContainer);
  // Listen and respond to ads loaded and error events.
  adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded, false);
  adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

  adDisplayContainer.initialize();

  requestAds();
}

/**
 * Sets the 'adContainer' div as the IMA ad display container.
 */
function createAdDisplayContainer() {
  const adContainer = document.getElementById('content');
  adContainer.style.position = 'absolute';
  adContainer.style.top = '0';
  adContainer.style.left = '0';
  adContainer.style.width = '100vw';
  adContainer.style.height = '100vh';

  adDisplayContainer = new google.ima.AdDisplayContainer(adContainer);
}

/**
 * Builds an ad request and uses it to request ads.
 */
function requestAds() {
  width = window.innerWidth;
  height = window.innerHeight;

  // Request video ads.
  const adsRequest = new google.ima.AdsRequest();
  adsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/6881/televisa.bullmedia/spotvideo&description_url=https%3A%2F%2Fbullmedia.mx%2F&tfcd=0&npa=0&sz=640x360%7C640x480%7C854x480%7C1200x675%7C1280x720%7C1280x800%7C1920x1080&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&ad_rule=1&vpmute=0&plcmt=1&correlator=';

  // Specify the linear and nonlinear slot sizes.
  adsRequest.linearAdSlotWidth = width;
  adsRequest.linearAdSlotHeight = height;

  adsRequest.nonLinearAdSlotWidth = width;
  adsRequest.nonLinearAdSlotHeight = (150*width)/640;

  adsLoader.requestAds(adsRequest);
}

/**
 * Handles the ad manager loading and sets ad event listeners.
 * @param {!google.ima.AdsManagerLoadedEvent} adsManagerLoadedEvent
 */
function onAdsManagerLoaded(adsManagerLoadedEvent) {
  const adsRenderingSettings = new google.ima.AdsRenderingSettings();
  adsRenderingSettings.loadVideoTimeout = 16000;
  adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
  adsRenderingSettings.autoPlayAdBreaks = true;
  
  adsManager = adsManagerLoadedEvent.getAdsManager(null, adsRenderingSettings);

  // Iniciar silenciado si no hay interacción del usuario
  if (!isUserInteracted) {
    adsManager.setVolume(0);
    document.getElementById('unmuteButton').style.display = 'block';
    document.getElementById('unmuteButton').querySelector('path:last-child').style.display = 'none';
  }

  // Add listeners to the required events.
  adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
  adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEvent);

  playAds();
}

/**
 * Loads the video content and initializes IMA ad playback.
 */
function playAds() {
  try {
    adsManager.init(width, height, google.ima.ViewMode.NORMAL);
    adsManager.start();
  } catch (adError) {
    console.log('Error al iniciar los anuncios:', adError);
    // Mostrar botón de play si falla
    document.getElementById('playButton').style.display = 'block';
  }
}

/**
 * Handles actions taken in response to ad events.
 * @param {!google.ima.AdEvent} adEvent
 */
function onAdEvent(adEvent) {
  const ad = adEvent.getAd();
  const transitionScreen = document.getElementById('transitionScreen');
  
  switch (adEvent.type) {
    case google.ima.AdEvent.Type.LOADED:
      console.log('Anuncio cargado');
      transitionScreen.style.opacity = '0';
      transitionScreen.style.visibility = 'hidden';
      transitionScreen.style.transition = 'opacity 0.5s ease-in-out';
      break;
    case google.ima.AdEvent.Type.STARTED:
      console.log('Anuncio iniciado');
      break;
    case google.ima.AdEvent.Type.SKIPPED:
      console.log('Anuncio skipeado');
      break;
    case google.ima.AdEvent.Type.COMPLETE:
      console.log('Anuncio completado');
      break;
    case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
      console.log('Todo Anuncio completado');
      transitionScreen.style.opacity = '1';
      transitionScreen.style.visibility = 'visible';
      transitionScreen.style.transition = 'opacity 0.5s ease-in-out';
      setTimeout(() => {
        console.log('Se pide nuevo Anuncio');
        if (adsManager) {
          adsManager.destroy();
        }
        requestAds();
      }, 500);
      break;
  }
}

/**
 * Handles ad errors.
 * @param {!google.ima.AdErrorEvent} adErrorEvent
 */
function onAdError(adErrorEvent) {
  console.error('Error en la carga del anuncio:', adErrorEvent.getError());
  if (adsManager) {
    adsManager.destroy();
  }
  setTimeout(requestAds, 2000);
}

// Ajustar el tamaño de los anuncios al cambiar el tamaño de la ventana
window.addEventListener('resize', () => {
  if (adsManager) {
    width = window.innerWidth;
    height = window.innerHeight;
    adsManager.resize(width, height, google.ima.ViewMode.NORMAL);
  }
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);