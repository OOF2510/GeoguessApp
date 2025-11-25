import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  imageUrl: string;
};

const BACKEND_URL = 'https://geo.api.oof2510.space';

export function PanoViewer({ imageUrl }: Props) {
  const proxiedUrl = `${BACKEND_URL}/proxy-image?url=${encodeURIComponent(
    imageUrl,
  )}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
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
          }
          #canvas {
            width: 100vw;
            height: 100vh;
            display: block;
            touch-action: none;
          }
          #status {
            position: absolute;
            top: 10px;
            left: 10px;
            color: white;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            font-family: Arial;
            font-size: 12px;
            z-index: 10;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div id="status">Loading...</div>
        <canvas id="canvas"></canvas>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

        <script>
          (function() {
            const status = document.getElementById('status');
            
            function log(msg) {
              console.log(msg);
              if (status) status.textContent = msg;
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(msg);
            }

            if (typeof THREE === 'undefined') {
              log('Error: THREE.js not loaded');
              return;
            }

            log('Initializing...');

            const canvas = document.getElementById('canvas');
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(
              75,
              window.innerWidth / window.innerHeight,
              0.1,
              1000
            );
            camera.position.set(0, 0, 0.1);

            const renderer = new THREE.WebGLRenderer({
              canvas: canvas,
              antialias: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            // Create sphere geometry
            const geometry = new THREE.SphereGeometry(500, 60, 40);
            geometry.scale(-1, 1, 1); // Invert to see inside

            // Load texture
            log('Loading image...');
            const loader = new THREE.TextureLoader();
            loader.crossOrigin = 'anonymous';
            
            loader.load(
              ${JSON.stringify(proxiedUrl)},
              function(texture) {
                log('Image loaded successfully!');
                
                const material = new THREE.MeshBasicMaterial({
                  map: texture
                });
                
                const sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);

                // Hide status after success
                setTimeout(() => {
                  if (status) status.style.display = 'none';
                }, 2000);

                // Touch/drag controls
                let isDragging = false;
                let previousTouch = { x: 0, y: 0 };
                const sensitivity = 0.005;
                let lon = 0;
                let lat = 0;

                function updateView() {
                  // Convert spherical coordinates to camera rotation
                  const phi = THREE.MathUtils.degToRad(90 - lat);
                  const theta = THREE.MathUtils.degToRad(lon);

                  camera.position.x = 100 * Math.sin(phi) * Math.cos(theta);
                  camera.position.y = 100 * Math.cos(phi);
                  camera.position.z = 100 * Math.sin(phi) * Math.sin(theta);
                  
                  camera.lookAt(scene.position);
                }

                canvas.addEventListener('touchstart', (e) => {
                  isDragging = true;
                  const touch = e.touches[0];
                  previousTouch = { x: touch.clientX, y: touch.clientY };
                  e.preventDefault();
                }, { passive: false });

                canvas.addEventListener('touchmove', (e) => {
                  if (!isDragging) return;
                  
                  const touch = e.touches[0];
                  const deltaX = touch.clientX - previousTouch.x;
                  const deltaY = touch.clientY - previousTouch.y;

                  lon -= deltaX * 0.3;
                  lat -= deltaY * 0.3; 
                  
                  // Limit vertical rotation to prevent flipping
                  lat = Math.max(-85, Math.min(85, lat));

                  updateView();

                  previousTouch = { x: touch.clientX, y: touch.clientY };
                  e.preventDefault();
                }, { passive: false });

                canvas.addEventListener('touchend', () => {
                  isDragging = false;
                });

                // Mouse controls for testing
                let isMouseDown = false;
                canvas.addEventListener('mousedown', (e) => {
                  isMouseDown = true;
                  previousTouch = { x: e.clientX, y: e.clientY };
                });

                canvas.addEventListener('mousemove', (e) => {
                  if (!isMouseDown) return;
                  
                  const deltaX = e.clientX - previousTouch.x;
                  const deltaY = e.clientY - previousTouch.y;

                  lon -= deltaX * 0.3;
                  lat -= deltaY * 0.3; 

                  lat = Math.max(-85, Math.min(85, lat));

                  updateView();

                  previousTouch = { x: e.clientX, y: e.clientY };
                });

                canvas.addEventListener('mouseup', () => {
                  isMouseDown = false;
                });

                // Initial view
                updateView();

                // Render loop
                function animate() {
                  requestAnimationFrame(animate);
                  renderer.render(scene, camera);
                }
                animate();
              },
              function(xhr) {
                const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
                log('Loading: ' + percent + '%');
              },
              function(error) {
                log('Error loading image: ' + error.message);
              }
            );

            // Handle window resize
            window.addEventListener('resize', () => {
              camera.aspect = window.innerWidth / window.innerHeight;
              camera.updateProjectionMatrix();
              renderer.setSize(window.innerWidth, window.innerHeight);
            });

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
        onError={syntheticEvent => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onMessage={event => {
          console.log('[PanoViewer]:', event.nativeEvent.data);
        }}
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
