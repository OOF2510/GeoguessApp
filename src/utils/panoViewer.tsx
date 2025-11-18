import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  imageUrl: string;
};

export function PanoViewer({ imageUrl }: Props) {
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
          (function() {
            // Wait for all scripts to load
            function initViewer() {
              try {
                const loading = document.getElementById('loading');
                
                // Check if PhotoSphereViewer is loaded
                if (typeof PhotoSphereViewer === 'undefined') {
                  console.error('PhotoSphereViewer not loaded');
                  if (loading) loading.textContent = 'Error: Viewer not loaded';
                  return;
                }

                const viewer = new PhotoSphereViewer.Viewer({
                  container: document.getElementById('viewer'),
                  panorama: ${JSON.stringify(imageUrl)},
                  defaultLong: 0,
                  defaultLat: 0,
                  navbar: ['zoom', 'fullscreen'],
                  mousewheel: true,
                  mousemove: true,
                  touchmoveTwoFingers: false,
                  loadingImg: null,
                  loadingTxt: 'Loading...',
                  size: {
                    width: '100%',
                    height: '100%'
                  },
                });

                // Hide loading message once ready
                viewer.once('ready', function() {
                  console.log('Panorama loaded successfully');
                  if (loading) loading.style.display = 'none';
                });

                // Error handling
                viewer.once('panorama-error', function(err) {
                  console.error('Panorama load error:', err);
                  if (loading) loading.textContent = 'Error loading panorama';
                });

              } catch (error) {
                console.error('Error initializing viewer:', error);
                const loading = document.getElementById('loading');
                if (loading) loading.textContent = 'Error: ' + error.message;
              }
            }

            // Initialize when DOM is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initViewer);
            } else {
              // Give scripts time to load
              setTimeout(initViewer, 100);
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
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('HTTP error:', nativeEvent.statusCode);
        }}
        onMessage={(event) => {
          console.log('WebView message:', event.nativeEvent.data);
        }}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        )}
        startInLoadingState={true}
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
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
});