// Versión mejorada de ads.js que maneja todos los errores reportados

// 1. Variables globales con protección
let adsManager = null;
let adsLoader = null;
let adDisplayContainer = null;
let width = 0;
let height = 0;
let isUserInteracted = false;
let isInIframe = false;

// 2. Detección segura de entorno
function detectEnvironment() {
    try {
        isInIframe = window.self !== window.top;
        console.log(`Entorno detectado: ${isInIframe ? 'Iframe' : 'Página directa'}`);
    } catch (e) {
        console.warn('Error al detectar entorno:', e);
        isInIframe = false;
    }
}

// 3. Inicialización segura del SDK IMA
function verifyIMASDK() {
    if (typeof google === 'undefined' || !google.ima) {
        console.error('IMA SDK no está cargado correctamente');
        
        // Intentar recuperación para desarrollo local
        if (window.location.protocol === 'file:') {
            console.warn('Modo local detectado - cargando SDK desde CDN');
            const script = document.createElement('script');
            script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
            script.onload = initializeAfterSDKLoad;
            script.onerror = handleSDKLoadError;
            document.head.appendChild(script);
            return false;
        }
        return false;
    }
    return true;
}

function handleSDKLoadError() {
    console.error('Falló la carga del SDK IMA');
    document.getElementById('playButton').style.display = 'block';
}

function initializeAfterSDKLoad() {
    if (verifyIMASDK()) {
        safeInit();
    }
}

// 4. Sistema de mensajes seguro para iframes
function setupMessageSystem() {
    if (!isInIframe) return;

    window.addEventListener('message', (event) => {
        // Verificación de origen para seguridad
        const allowedOrigins = [
            'https://eduardoalonsog.github.io',
            'file://',
            'http://localhost',
            'http://127.0.0.1'
        ];

        if (!allowedOrigins.some(origin => event.origin.startsWith(origin))) {
            return;
        }

        if (event.data.type === 'initAds') {
            console.log('Comando de inicio recibido');
            startPlayback();
        }
    });

    // Notificar al padre que estamos listos
    window.parent.postMessage({ type: 'adsReady' }, '*');
}

// 5. Inicialización principal segura
function safeInit() {
    try {
        detectEnvironment();
        
        if (!verifyIMASDK()) {
            throw new Error('SDK IMA no disponible');
        }

        // Configurar elementos UI
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.style.display = 'block';
            playButton.addEventListener('click', () => {
                isUserInteracted = true;
                playButton.style.display = 'none';
                startPlayback();
            });
        }

        // Configurar sistema de mensajes si es iframe
        if (isInIframe) {
            setupMessageSystem();
        } else {
            // Autoplay para página directa
            startPlayback();
        }
    } catch (error) {
        console.error('Error en safeInit:', error);
        showFallbackUI();
    }
}

function showFallbackUI() {
    const playButton = document.getElementById('playButton');
    if (playButton) {
        playButton.style.display = 'block';
        playButton.textContent = 'Clic para reintentar';
        playButton.onclick = () => {
            window.location.reload();
        };
    }
}

// 6. Control de reproducción
function startPlayback() {
    try {
        setUpIMA();
    } catch (error) {
        console.error('Error en startPlayback:', error);
        setTimeout(startPlayback, 2000); // Reintentar después de 2 segundos
    }
}

// 7. Configuración IMA (resto de tus funciones originales con manejo de errores)
function setUpIMA() {
    try {
        createAdDisplayContainer();
        
        adsLoader = new google.ima.AdsLoader(adDisplayContainer);
        
        // Configuración de event listeners con protección
        const safeAddEventListener = (target, event, handler) => {
            try {
                target.addEventListener(event, handler, false);
            } catch (e) {
                console.error(`Error al agregar listener para ${event}:`, e);
            }
        };

        safeAddEventListener(adsLoader, 
            google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, 
            onAdsManagerLoaded);
            
        safeAddEventListener(adsLoader, 
            google.ima.AdErrorEvent.Type.AD_ERROR, 
            onAdError);

        adDisplayContainer.initialize();
        requestAds();
    } catch (error) {
        console.error('Error en setUpIMA:', error);
        throw error;
    }
}

// 8. Función createAdDisplayContainer con verificación
function createAdDisplayContainer() {
    try {
        const adContainer = document.getElementById('content');
        if (!adContainer) {
            throw new Error('Elemento #content no encontrado');
        }

        // Configuración de estilos segura
        const safeStyleApply = (element, styles) => {
            Object.keys(styles).forEach(prop => {
                try {
                    element.style[prop] = styles[prop];
                } catch (e) {
                    console.error(`Error al aplicar estilo ${prop}:`, e);
                }
            });
        };

        safeStyleApply(adContainer, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh'
        });

        adDisplayContainer = new google.ima.AdDisplayContainer(adContainer);
    } catch (error) {
        console.error('Error en createAdDisplayContainer:', error);
        throw error;
    }
}

// 9. Manejo de eventos de anuncios con protección
function onAdEvent(adEvent) {
    try {
        const transitionScreen = document.getElementById('transitionScreen');
        if (!transitionScreen) return;

        const safeStyleTransition = (element, styles) => {
            try {
                Object.assign(element.style, styles);
            } catch (e) {
                console.error('Error en transición de estilos:', e);
            }
        };

        switch (adEvent.type) {
            case google.ima.AdEvent.Type.LOADED:
                safeStyleTransition(transitionScreen, {
                    opacity: '0',
                    visibility: 'hidden',
                    transition: 'opacity 0.5s ease-in-out'
                });
                break;
                
            case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
                safeStyleTransition(transitionScreen, {
                    opacity: '1',
                    visibility: 'visible',
                    transition: 'opacity 0.5s ease-in-out'
                });
                setTimeout(() => {
                    if (adsManager) {
                        adsManager.destroy();
                        adsManager = null;
                    }
                    requestAds();
                }, 500);
                break;
        }

        // Notificar al padre sobre eventos importantes
        if (isInIframe && window.parent) {
            window.parent.postMessage({
                type: 'adEvent',
                event: adEvent.type
            }, '*');
        }
    } catch (error) {
        console.error('Error en onAdEvent:', error);
    }
}

// 10. Inicialización cuando el DOM está listo
function domReady() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(safeInit, 1);
    } else {
        document.addEventListener('DOMContentLoaded', safeInit);
    }
}

// Iniciar todo
domReady();

// [Aquí incluirías el resto de tus funciones originales (requestAds, onAdsManagerLoaded, playAds, onAdError)
// con el mismo nivel de manejo de errores y protección]