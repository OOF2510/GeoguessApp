import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  imageUrl: string;
};

export function PanoViewer({ imageUrl }: Props) {
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the image as a blob
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setBase64Image(base64data);
          setLoading(false);
        };
        reader.onerror = () => {
          setError('Failed to convert image');
          setLoading(false);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Error loading image:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setLoading(false);
      }
    };

    if (imageUrl) {
      loadImage();
    }
  }, [imageUrl]);

  const html = base64Image ? `
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
        </style>
      </head>
      <body>
        <div id="viewer"></div>

        <script src="https://cdn.jsdelivr.net/npm/three@0.147/build/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/uevent@2/browser.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/photo-sphere-viewer@4/dist/photo-sphere-viewer.min.js"></script>

        <script>
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
                if (typeof PhotoSphereViewer === 'undefined') {
                  console.error('PhotoSphereViewer not loaded');
                  return;
                }

                const viewer = new PhotoSphereViewer.Viewer({
                  container: document.getElementById('viewer'),
                  panorama: ${JSON.stringify(base64Image)},
                  defaultLong: 0,
                  defaultLat: 0,
                  navbar: false,
                  mousewheel: true,
                  mousemove: true,
                  touchmoveTwoFingers: false,
                  size: {
                    width: '100%',
                    height: '100%'
                  },
                  fisheye: false,
                });

                viewer.once('ready', function() {
                  console.log('Panorama loaded');
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
                });

                viewer.once('panorama-error', function(err) {
                  console.error('Panorama error:', err);
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage('error');
                });

              } catch (error) {
                console.error('Error initializing viewer:', error);
              }
            }

            if (document.readyState === 'complete') {
              setTimeout(initViewer, 100);
            } else {
              window.addEventListener('load', function() {
                setTimeout(initViewer, 100);
              });
            }
          })();
        </script>
      </body>
    </html>
  ` : '';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading panorama...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load panorama</Text>
        <Text style={styles.errorDetails}>{error}</Text>
      </View>
    );
  }

  if (!base64Image) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No image data</Text>
      </View>
    );
  }

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
        cacheEnabled={false}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorDetails: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
});