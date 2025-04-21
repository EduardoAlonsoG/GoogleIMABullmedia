// Copyright 2017 Google Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

let adsManager;
let adsLoader;
let adDisplayContainer;
let width;
let height;
let isUserInteracted = false;

// Detectar si estamos en un iframe
const isInIframe = window.self !== window.top;

window.addEventListener('message', function(event) {
  // Verificar origen del mensaje
  if (event.origin !== "https://eduardoalonsog.github.io" && 
      event.origin !== "file://") return;
  
  if (event.data.type === 'init') {
      // Configurar según parámetros recibidos
      const config = event.data.config || {};
      
      // Inicializar con configuración específica
      initWithConfig(config);
  }
});

function initWithConfig(config) {
  // Modificar el comportamiento según la configuración
  if (config.allowCookies === false) {
      // Deshabilitar funcionalidades que requieren cookies
      console.log('Modo sin cookies habilitado');
  }
  
  // Iniciar lógica de anuncios
  if (config.autoplay) {
      initDesktopAutoplay();
  } else {
      // Mostrar botón de play
      const playButton = document.getElementById('playButton');
      if (playButton) {
          playButton.style.display = 'block';
      }
  }
}

function initDesktopAutoplay() {
  try {
      // Verificar si el SDK IMA está cargado correctamente
      if (typeof google === 'undefined' || !google.ima) {
          throw new Error('IMA SDK no está cargado correctamente');
      }
      
      setUpIMA();
  } catch (error) {
      console.error('Error en initDesktopAutoplay:', error);
      
      // Notificar al padre sobre el error
      if (window.parent) {
          window.parent.postMessage({
              type: 'error',
              message: error.message
          }, '*');
      }
      
      // Reintentar después de un retraso
      setTimeout(initDesktopAutoplay, 2000);
  }
}
// Función de inicialización segura
function safeInit() {
    try {
        // Verificar elementos del DOM
        const playButton = document.getElementById('playButton');
        const transitionScreen = document.getElementById('transitionScreen');
        
        if (!playButton || !transitionScreen) {
            console.error('Elementos esenciales no encontrados');
            return;
        }

        // Configurar listeners solo si los elementos existen
        if (isInIframe) {
            // Lógica para iframe
            window.addEventListener('message', handleParentMessages);
            window.parent.postMessage('adsReady', '*');
        } else {
            // Lógica para vista directa
            playButton.style.display = 'block';
            playButton.addEventListener('click', startPlayback);
        }
    } catch (error) {
        console.error('Error en safeInit:', error);
    }
}

function handleParentMessages(event) {
    if (event.data === 'initAds') {
        startPlayback();
    }
}

function startPlayback() {
    try {
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.style.display = 'none';
        }
        isUserInteracted = true;
        setUpIMA();
    } catch (error) {
        console.error('Error en startPlayback:', error);
    }
}

function setUpIMA() {
    try {
        createAdDisplayContainer();
        
        adsLoader = new google.ima.AdsLoader(adDisplayContainer);
        adsLoader.addEventListener(
            google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            onAdsManagerLoaded, 
            false
        );
        adsLoader.addEventListener(
            google.ima.AdErrorEvent.Type.AD_ERROR, 
            onAdError, 
            false
        );

        adDisplayContainer.initialize();
        requestAds();
    } catch (error) {
        console.error('Error en setUpIMA:', error);
    }
}

function createAdDisplayContainer() {
    try {
        const adContainer = document.getElementById('content');
        if (!adContainer) {
            throw new Error('Contenedor de anuncios no encontrado');
        }

        adContainer.style.position = 'absolute';
        adContainer.style.top = '0';
        adContainer.style.left = '0';
        adContainer.style.width = '100vw';
        adContainer.style.height = '100vh';

        adDisplayContainer = new google.ima.AdDisplayContainer(adContainer);
    } catch (error) {
        console.error('Error en createAdDisplayContainer:', error);
        throw error;
    }
}

function requestAds() {
    try {
        width = window.innerWidth;
        height = window.innerHeight;

        const adsRequest = new google.ima.AdsRequest();
        adsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/6881/televisa.bullmedia/spotvideo&description_url=https%3A%2F%2Fbullmedia.mx%2F&tfcd=0&npa=0&sz=640x360%7C640x480%7C854x480%7C1200x675%7C1280x720%7C1280x800%7C1920x1080&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&ad_rule=1&vpmute=0&plcmt=1&correlator=';

        adsRequest.linearAdSlotWidth = width;
        adsRequest.linearAdSlotHeight = height;
        adsRequest.nonLinearAdSlotWidth = width;
        adsRequest.nonLinearAdSlotHeight = (150*width)/640;

        adsLoader.requestAds(adsRequest);
    } catch (error) {
        console.error('Error en requestAds:', error);
        setTimeout(requestAds, 2000);
    }
}

function onAdsManagerLoaded(adsManagerLoadedEvent) {
    try {
        const adsRenderingSettings = new google.ima.AdsRenderingSettings();
        adsRenderingSettings.loadVideoTimeout = 16000;
        adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
        
        adsManager = adsManagerLoadedEvent.getAdsManager(null, adsRenderingSettings);
        
        if (!isUserInteracted) {
            adsManager.setVolume(0);
        }

        // Configurar event listeners
        const eventTypes = [
            google.ima.AdErrorEvent.Type.AD_ERROR,
            google.ima.AdEvent.Type.LOADED,
            google.ima.AdEvent.Type.STARTED,
            google.ima.AdEvent.Type.COMPLETE,
            google.ima.AdEvent.Type.ALL_ADS_COMPLETED
        ];

        eventTypes.forEach(type => {
            adsManager.addEventListener(type, onAdEvent);
        });

        playAds();
    } catch (error) {
        console.error('Error en onAdsManagerLoaded:', error);
        onAdError(error);
    }
}

function playAds() {
    try {
        adsManager.init(width, height, google.ima.ViewMode.NORMAL);
        adsManager.start();
    } catch (adError) {
        console.error('Error en playAds:', adError);
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.style.display = 'block';
        }
    }
}

function onAdEvent(adEvent) {
    try {
        const transitionScreen = document.getElementById('transitionScreen');
        if (!transitionScreen) return;

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
                    if (adsManager) {
                        adsManager.destroy();
                    }
                    requestAds();
                }, 500);
                break;
        }
    } catch (error) {
        console.error('Error en onAdEvent:', error);
    }
}

function onAdError(adErrorEvent) {
    try {
        console.error('Error en la carga del anuncio:', adErrorEvent ? adErrorEvent.getError() : 'Error desconocido');
        if (adsManager) {
            adsManager.destroy();
        }
        setTimeout(requestAds, 2000);
    } catch (error) {
        console.error('Error en onAdError:', error);
    }
}

// Resize handler
window.addEventListener('resize', () => {
    if (adsManager) {
        try {
            width = window.innerWidth;
            height = window.innerHeight;
            adsManager.resize(width, height, google.ima.ViewMode.NORMAL);
        } catch (error) {
            console.error('Error en resize handler:', error);
        }
    }
});

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', safeInit);

// Fallback en caso de que el DOM ya esté listo
if (document.readyState !== 'loading') {
    safeInit();
}