import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  imageUrl: string;
};

const BACKEND_URL = 'https://geo.api.oof2510.space';

export function PanoViewer({ imageUrl }: Props) {
  // Create proxied URL
  const proxiedUrl = useMemo(() => {
    return `${BACKEND_URL}/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  }, [imageUrl]);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/photo-sphere-viewer@4/dist/photo-sphere-viewer.min.css" />
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
            position: fixed;
          }
          #viewer {
            width: 100vw;
            height: 100vh;
            position: absolute;
            top: 0;
            left: 0;
          }
          #loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div id="loading">Loading panorama...</div>
        <div id="viewer"></div>

        <script src="https://cdn.jsdelivr.net/npm/three@0.147/build/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/uevent@2/browser.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/photo-sphere-viewer@4/dist/photo-sphere-viewer.min.js"></script>

        <script>
          const loading = document.getElementById('loading');
          
          function log(msg) {
            console.log(msg);
            if (loading) loading.textContent = msg;
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(msg);
          }

          // Override localStorage to prevent errors
          window.localStorage = {
            getItem: function() { return null; },
            setItem: function() {},
            removeItem: function() {},
            clear: function() {},
            key: function() { return null; },
            length: 0
          };
          window.sessionStorage = window.localStorage;

          (function() {
            function initViewer() {
              try {
                log('Initializing viewer...');
                
                if (typeof PhotoSphereViewer === 'undefined') {
                  log('Error: PhotoSphereViewer not loaded');
                  return;
                }
                
                if (typeof THREE === 'undefined') {
                  log('Error: THREE.js not loaded');
                  return;
                }

                const viewer = new PhotoSphereViewer.Viewer({
                  container: document.getElementById('viewer'),
                  panorama: ${JSON.stringify(proxiedUrl)},
                  defaultLong: 0,
                  defaultLat: 0,
                  navbar: false,
                  mousewheel: true,
                  mousemove: true,
                  touchmoveTwoFingers: false,
                  minFov: 30,
                  maxFov: 90,
                  defaultZoomLvl: 50,
                  fisheye: false,
                });

                viewer.once('ready', function() {
                  log('Ready!');
                  setTimeout(() => {
                    if (loading) loading.style.display = 'none';
                  }, 1000);
                });

                viewer.once('panorama-error', function(err) {
                  log('Error loading panorama: ' + (err ? err.message : 'unknown'));
                });

              } catch (error) {
                log('Error: ' + error.message);
              }
            }

            // Wait for libraries to load
            let attempts = 0;
            function tryInit() {
              attempts++;
              if (typeof PhotoSphereViewer !== 'undefined' && typeof THREE !== 'undefined') {
                setTimeout(initViewer, 100);
              } else if (attempts < 30) {
                setTimeout(tryInit, 200);
              } else {
                log('Timeout: Libraries failed to load');
              }
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', tryInit);
            } else {
              tryInit();
            }
          })();
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        cacheEnabled={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onMessage={(event) => {
          console.log('[PanoViewer]:', event.nativeEvent.data);
        }}
        scalesPageToFit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  webview: {
    flex: 1,
    backgroundColor: 'black',
  },
});