import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  imageUrl: string;
  enableGyro?: boolean;
  onMessage?: (event: any) => void;
};

const BACKEND_URL = 'https://geo.api.oof2510.space';

export function PanoViewer({ imageUrl, enableGyro = false, onMessage }: Props) {
  const proxiedUrl = `${BACKEND_URL}/proxy-image?url=${encodeURIComponent(imageUrl)}`;

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

// Touch/drag controls with inertia
            let isDragging = false;
            let previousTouch = { x: 0, y: 0 };
            let velocity = { x: 0, y: 0 };
            let lastTouchTime = 0;
            let inertiaEnabled = true;
            let inertiaDecay = 0.95;
            const baseSensitivity = 0.3;
            let lon = 0;
            let lat = 0;
            let zoomLevel = 1.0;
            let minZoom = 0.5;
            let maxZoom = 3.0;

            function updateView() {
              // Convert spherical coordinates to camera rotation
              const phi = THREE.MathUtils.degToRad(90 - lat);
              const theta = THREE.MathUtils.degToRad(lon);

              // Adjust camera distance based on zoom level
              const distance = 100 / zoomLevel;
              
              camera.position.x = distance * Math.sin(phi) * Math.cos(theta);
              camera.position.y = distance * Math.cos(phi);
              camera.position.z = distance * Math.sin(phi) * Math.sin(theta);
              
              camera.lookAt(scene.position);
              
              // Update FOV based on zoom
              camera.fov = 75 / zoomLevel;
              camera.updateProjectionMatrix();
            }

            // Inertia animation loop
            function animateInertia() {
              if (isDragging) return;
              
              if (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1) {
                lon -= velocity.x;
                lat += velocity.y; // Fixed: was -=, now += for correct up/down movement
                
                // Apply velocity limits
                const maxVelocity = 5;
                velocity.x = Math.max(-maxVelocity, Math.min(maxVelocity, velocity.x));
                velocity.y = Math.max(-maxVelocity, Math.min(maxVelocity, velocity.y));
                
                // Limit vertical rotation to prevent flipping
                lat = Math.max(-85, Math.min(85, lat));

                updateView();
                
                // Decay velocity
                velocity.x *= inertiaDecay;
                velocity.y *= inertiaDecay;
                
                requestAnimationFrame(animateInertia);
              }
            }

            canvas.addEventListener('touchstart', (e) => {
              isDragging = true;
              const now = Date.now();
              
              // Calculate velocity from previous movement
              if (lastTouchTime > 0 && e.touches.length === 1) {
                const deltaTime = (now - lastTouchTime) / 1000;
                if (deltaTime < 0.2) { // Only calculate if recent
                  const deltaX = e.touches[0].clientX - previousTouch.x;
                  const deltaY = e.touches[0].clientY - previousTouch.y;
                  velocity.x = deltaX / deltaTime / 100; // Normalize
                  velocity.y = deltaY / deltaTime / 100;
                }
              }
              
              lastTouchTime = now;
              
              if (e.touches.length === 1) {
                previousTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              } else if (e.touches.length === 2) {
                // Start pinch gesture
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                previousTouch.distance = Math.sqrt(dx * dx + dy * dy);
              }
              
              e.preventDefault();
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
              if (!isDragging) return;
              e.preventDefault();
              
              if (e.touches.length === 1) {
                // Single finger drag
                const touch = e.touches[0];
                const deltaX = touch.clientX - previousTouch.x;
                const deltaY = touch.clientY - previousTouch.y;

                lon -= deltaX * baseSensitivity;
                lat += deltaY * baseSensitivity; // Fixed: was -=, now += for correct up/down movement
                
                // Update velocity for inertia
                const now = Date.now();
                const deltaTime = (now - lastTouchTime) / 1000;
                if (deltaTime > 0) {
                  velocity.x = deltaX / deltaTime / 100;
                  velocity.y = deltaY / deltaTime / 100;
                }
                
                lastTouchTime = now;

                // Limit vertical rotation to prevent flipping
                lat = Math.max(-85, Math.min(85, lat));

                updateView();
                previousTouch = { x: touch.clientX, y: touch.clientY };
                
              } else if (e.touches.length === 2) {
                // Pinch to zoom
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.sqrt(
                  Math.pow(touch2.clientX - touch1.clientX, 2) +
                  Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                if (previousTouch.distance) {
                  const scale = currentDistance / previousTouch.distance;
                  zoomLevel *= scale;
                  zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
                  updateView();
                }
                
                previousTouch.distance = currentDistance;
              }
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
              if (e.touches.length === 0) {
                // All fingers lifted
                isDragging = false;
                if (inertiaEnabled) {
                  requestAnimationFrame(animateInertia);
                }
              } else if (e.touches.length === 1) {
                // One finger still touching, reset for single finger gestures
                previousTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }
            });                // Mouse controls for testing
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
                  lat += deltaY * 0.3;
                  
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

            // Device orientation controls (gyro)
            let gyroEnabled = false;
            let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
            let initialOrientation = { alpha: 0, beta: 0, gamma: 0 };
            let gyroSensitivity = 0.5;

            function handleDeviceOrientation(event: DeviceOrientationEvent) {
              if (!gyroEnabled || !event.beta || !event.gamma) return;
              
              const alpha = event.alpha || 0;
              const beta = event.beta;
              const gamma = event.gamma;
              
              deviceOrientation = { alpha, beta, gamma };
              
              // Calculate relative movement from initial position
              let lonDelta = (gamma - initialOrientation.gamma) * gyroSensitivity;
              let latDelta = (beta - initialOrientation.beta) * gyroSensitivity;
              
              // Apply limits to prevent extreme movements
              lonDelta = Math.max(-10, Math.min(10, lonDelta));
              latDelta = Math.max(-10, Math.min(10, latDelta));
              
              const newLon = initialOrientation.alpha + lonDelta;
              const newLat = initialOrientation.beta + latDelta;
              
              // Update camera position
              lon = newLon;
              lat = Math.max(-85, Math.min(85, newLat));
              
              updateView();
            }

            function enableGyroControls() {
              if (!gyroEnabled) {
                gyroEnabled = true;
                if (window.DeviceOrientationEvent) {
                  window.addEventListener('deviceorientation', handleDeviceOrientation);
                  // Capture initial orientation when enabling
                  setTimeout(() => {
                    initialOrientation = { ...deviceOrientation };
                  }, 100);
                  log('Gyro controls enabled');
                } else {
                  log('Gyro not supported on this device');
                  gyroEnabled = false;
                }
              }
            }

            function disableGyroControls() {
              gyroEnabled = false;
              window.removeEventListener('deviceorientation', handleDeviceOrientation);
              log('Gyro controls disabled');
            }

            // Listen for messages from React Native
            window.addEventListener('message', (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.type === 'enableGyro') {
                  enableGyroControls();
                } else if (data.type === 'disableGyro') {
                  disableGyroControls();
                } else if (data.type === 'toggleGyro') {
                  if (gyroEnabled) {
                    disableGyroControls();
                  } else {
                    enableGyroControls();
                  }
                }
              } catch (e) {
                // Ignore invalid JSON
              }
            });

            // Post message about gyro availability
            if (window.DeviceOrientationEvent) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'gyroAvailable',
                available: true
              }));
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
          if (onMessage) {
            onMessage(event);
          }
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