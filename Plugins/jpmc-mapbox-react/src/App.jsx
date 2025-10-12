import React from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import './App.css';
import { SigmaProvider } from './context/SigmaProvider.jsx';
import MapApplication from './components/MapApplication.jsx';

const App = () => (
  <SigmaProvider>
    <MapApplication />
  </SigmaProvider>
);

export default App;
