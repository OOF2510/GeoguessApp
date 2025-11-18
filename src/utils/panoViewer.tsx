import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  imageUrl: string
};

export function PanoViewer({ imageUrl }: Props) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/photo-sphere-viewer@4/dist/photo-sphere-viewer.min.css" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #000;
            overflow: hidden;
          }
          #viewer {
            width: 100vw;
            height: 100vh;
          }
        </style>
      </head>
      <body>
        <div id="viewer"></div>

        <script src="https://cdn.jsdelivr.net/npm/three@0.147/build/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/uevent@2/browser.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/photo-sphere-viewer@4/dist/photo-sphere-viewer.min.js"></script>

        <script>
          document.addEventListener('DOMContentLoaded', function () {
            const viewer = new PhotoSphereViewer.Viewer({
              container: document.getElementById('viewer'),
              panorama: '${imageUrl}',
              defaultLong: 0,
              defaultLat: 0,
              navbar: ['zoom', 'fullscreen'],
              mousewheel: true,
            });
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        source={{ html }}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
});
