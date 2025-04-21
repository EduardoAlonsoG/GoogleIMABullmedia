let adsManager;
let adsLoader;
let adDisplayContainer;
let width;
let height;
let isUserInteracted = false;

// Verificar si estamos en un iframe
const isInIframe = window.self !== window.top;

// Escuchar mensajes desde el padre (si está en iframe)
if (isInIframe) {
  window.addEventListener('message', function(event) {
    if (event.data === 'initAds') {
      initAds();
    }
  });
  
  // Notificar al padre que estamos listos
  window.parent.postMessage('adsReady', '*');
} else {
  // Iniciar directamente si no está en iframe
  document.addEventListener('DOMContentLoaded', initAds);
}

function initAds() {
  // Mostrar botón de play si no hay interacción
  if (!isUserInteracted) {
    const playButton = document.getElementById('playButton');
    playButton.style.display = 'block';
    playButton.addEventListener('click', function() {
      isUserInteracted = true;
      this.style.display = 'none';
      setUpIMA();
    });
  } else {
    setUpIMA();
  }
}

function setUpIMA() {
  createAdDisplayContainer();
 
  adsLoader = new google.ima.AdsLoader(adDisplayContainer);
  adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded, false);
  adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

  adDisplayContainer.initialize();
  requestAds();
}

function createAdDisplayContainer() {
  const adContainer = document.getElementById('content');
  adContainer.style.position = 'absolute';
  adContainer.style.top = '0';
  adContainer.style.left = '0';
  adContainer.style.width = '100vw';
  adContainer.style.height = '100vh';

  adDisplayContainer = new google.ima.AdDisplayContainer(adContainer);
}

function requestAds() {
  width = window.innerWidth;
  height = window.innerHeight;

  const adsRequest = new google.ima.AdsRequest();
  adsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/6881/televisa.bullmedia/spotvideo&description_url=https%3A%2F%2Fbullmedia.mx%2F&tfcd=0&npa=0&sz=640x360%7C640x480%7C854x480%7C1200x675%7C1280x720%7C1280x800%7C1920x1080&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&ad_rule=1&vpmute=0&plcmt=1&correlator=';

  adsRequest.linearAdSlotWidth = width;
  adsRequest.linearAdSlotHeight = height;
  adsRequest.nonLinearAdSlotWidth = width;
  adsRequest.nonLinearAdSlotHeight = (150*width)/640;

  adsLoader.requestAds(adsRequest);
}

function onAdsManagerLoaded(adsManagerLoadedEvent) {
  const adsRenderingSettings = new google.ima.AdsRenderingSettings();
  adsRenderingSettings.loadVideoTimeout = 16000;
  adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
  
  adsManager = adsManagerLoadedEvent.getAdsManager(null, adsRenderingSettings);
  
  // Iniciar silenciado si no hay interacción del usuario
  if (!isUserInteracted) {
    adsManager.setVolume(0);
  }

  adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
  adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEvent);

  playAds();
}

function playAds() {
  try {
    adsManager.init(width, height, google.ima.ViewMode.NORMAL);
    adsManager.start();
  } catch (adError) {
    console.log('Error al iniciar los anuncios:', adError);
    document.getElementById('playButton').style.display = 'block';
  }
}

function onAdEvent(adEvent) {
  const ad = adEvent.getAd();
  const transitionScreen = document.getElementById('transitionScreen');
  
  switch (adEvent.type) {
    case google.ima.AdEvent.Type.LOADED:
      transitionScreen.style.opacity = '0';
      transitionScreen.style.visibility = 'hidden';
      transitionScreen.style.transition = 'opacity 0.5s ease-in-out';
      break;
    case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
      transitionScreen.style.opacity = '1';
      transitionScreen.style.visibility = 'visible';
      transitionScreen.style.transition = 'opacity 0.5s ease-in-out';
      setTimeout(() => {
        adsManager.destroy();
        requestAds();
      }, 500);
      break;
  }
}

function onAdError(adErrorEvent) {
  console.error('Error en la carga del anuncio:', adErrorEvent.getError());
  if (adsManager) {
    adsManager.destroy();
  }
  setTimeout(requestAds, 2000);
}

window.addEventListener('resize', () => {
  if (adsManager) {
    width = window.innerWidth;
    height = window.innerHeight;
    adsManager.resize(width, height, google.ima.ViewMode.NORMAL);
  }
});