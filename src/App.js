import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';

mapboxgl.accessToken = 'pk.eyJ1Ijoia3JpdHM5OSIsImEiOiJjbHcwaWtwY2owMWhkMmptcXZ3aDJsZG55In0.Cr9qbPBZt6vKrXFVabgBQQ';

const App = () => {
  const [sliderValue, setSliderValue] = useState(0);
  const [opacityValue, setOpacityValue] = useState(1);
  const [uniqueDates, setUniqueDates] = useState([]);
  const [showFemale, setShowFemale] = useState(false);
  const [showMale, setShowMale] = useState(false);
  const [showSum, setShowSum] = useState(false);
  const mapContainerRef = useRef(null);
  const map = useRef(null);
  const mapLoaded = useRef(false);

  const minZoom = 7;
  const maxZoom = 12;
  const defaultZoom = 10;
  const maxBounds = [
    [23.0, 34.5],
    [26.5, 35.8]
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch GeoJSON data for points
        const response = await fetch('generator.geojson');
        const geojsonData = await response.json();
  
        // Extract unique dates from GeoJSON data
        const dates = [...new Set(geojsonData.features.map((feature) => feature.properties.Date.trim()))].sort();
        setUniqueDates(dates);
  
        // Fetch Lasithi boundaries GeoJSON
        const boundariesResponse = await fetch('lasithi_boundaries.geojson');
        const boundariesData = await boundariesResponse.json();
  
        // Filter points within the boundaries
        const filteredGeojsonData = filterPointsWithinBoundaries(geojsonData, boundariesData);
  
        // Initialize Mapbox map
        map.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [26.1, 35.2],
          zoom: defaultZoom,
          minZoom: minZoom,
          maxZoom: maxZoom,
          maxBounds: maxBounds
        });
  
        map.current.on('load', () => {
          mapLoaded.current = true;
          document.getElementById('slider').setAttribute('max', dates.length - 1);

  
        
          // Add sources
          if (!map.current.getSource('points_painting')) {
            map.current.addSource('points_painting', {
              type: 'geojson',
              data: filteredGeojsonData
            });
          }
        
          if (!map.current.getSource('lasithi_boundaries')) {
            map.current.addSource('lasithi_boundaries', {
              type: 'geojson',
              data: boundariesData
            });
          }
          
          map.current.painter.opaquePassEnabledForLayer = function() { return false; };

          const addHeatmapLayer = (id, property) => {
            if (!map.current.getLayer(id)) {
              map.current.addLayer({
                id: id,
                type: 'heatmap',
                source: 'points_painting',
                maxzoom: maxZoom + 1,
                minzoom: minZoom,
                maxBounds: boundariesData,
                paint: {
                  'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['get', property],
                    0,
                    0,
                    10,
                    1
                  ],
                  'heatmap-intensity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    minZoom,
                    1,
                    maxZoom,
                    4
                  ],
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0,
                    'rgba(33,102,172,0)',
                    0.2,
                    'rgb(103,169,207)',
                    0.4,
                    'rgb(209,229,240)',
                    0.6,
                    'rgb(253,219,199)',
                    0.8,
                    'rgb(239,138,98)',
                    1,
                    'rgb(178,24,43)'
                  ],
                  'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    minZoom,
                    80,
                    maxZoom,
                    20
                  ],
                  'heatmap-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    minZoom,
                    0.2,
                    maxZoom,
                    opacityValue
                  ]
                },
                layout: {
                  'visibility': 'visible',
                  'z-index':0
                },
                filter: ['==', 'Date', '']
              });
            }
          };

          
        
          // Add heatmap layers
          addHeatmapLayer('sumLayer', 'Sum');
          addHeatmapLayer('femaleLayer', 'Female');
          addHeatmapLayer('maleLayer', 'Male');
        
          // Add the boundary layer after the heatmap layers
          map.current.addLayer({
            id: 'mask-layer',
            type: 'fill',
            source: {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    // Define a larger polygon covering the entire map area
                    [
                      [-180, -90],
                      [180, -90],
                      [180, 90],
                      [-180, 90],
                      [-180, -90]
                    ],
                    // Exclude the boundaries area from the mask with a hole
                    ...boundariesData.features[0].geometry.coordinates
                  ]
                }
              }
            },
            paint: {
              
              'fill-color':'rgb(255,255,255)',
              'fill-opacity': 0.7
            },
            layout:{
              'visibility':'visible',
              'z-index':999
            }
          });
          
        
          
          // Adjust layer ordering to ensure mask-layer is above heatmap layers
          const maskLayerId='mask-layer';
          
          const heatmapLayers = ['sumLayer', 'femaleLayer', 'maleLayer'];
          heatmapLayers.forEach(layerId => {
            map.current.moveLayer(layerId, maskLayerId);
          });
        });
        } catch (error) {
        console.error('Error fetching GeoJSON data:', error);
      }
    };
    
    fetchData();
  
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);
  

  useEffect(() => {
    if (mapLoaded.current && uniqueDates.length) {
      const updateFilters = () => {
        const selectedDate = uniqueDates[sliderValue];
        const filters = ['==', ['get', 'Date'], selectedDate];

        const applyLayerFilter = (layerId, showLayer) => {
          if (showLayer) {
            map.current.setFilter(layerId, filters);
            map.current.setLayoutProperty(layerId, 'visibility', 'visible');
            map.current.setPaintProperty(layerId, 'heatmap-opacity', opacityValue);
          } else {
            map.current.setLayoutProperty(layerId, 'visibility', 'none');
          }
        };

        applyLayerFilter('sumLayer', showSum);
        applyLayerFilter('femaleLayer', showFemale);
        applyLayerFilter('maleLayer', showMale);
        
      };

      updateFilters();
      
    }
  }, [sliderValue, showFemale, showMale, showSum, uniqueDates, opacityValue]);

  const handleCheckboxChange = (checkbox) => {
    setShowSum(false);
    setShowFemale(false);
    setShowMale(false);

    switch (checkbox) {
      case 'sum':
        setShowSum(true);
        break;
      case 'female':
        setShowFemale(true);
        break;
      case 'male':
        setShowMale(true);
        break;
      default:
        break;
    }
  };

  // Simple point-in-polygon check
  const isPointInPolygon = (point, polygon) => {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const filterPointsWithinBoundaries = (pointsGeoJSON, boundariesGeoJSON) => {
    const boundaryCoordinates = boundariesGeoJSON.features[0].geometry.coordinates[0];
    const filteredFeatures = pointsGeoJSON.features.filter(feature => {
      const point = feature.geometry.coordinates;
      return isPointInPolygon(point, boundaryCoordinates);
    });
    return {
      type: 'FeatureCollection',
      features: filteredFeatures
    };
  };

  return (
    <div className="App">
      <div className="map-overlay">
        <h2>Dates</h2>
        <label id="date">{uniqueDates[sliderValue]}</label>
        <input
          id="slider"
          type="range"
          min="0"
          max={uniqueDates.length - 1}
          step="1"
          value={sliderValue}
          onChange={(e) => setSliderValue(parseInt(e.target.value, 10))}
        />
        <h2>Opacity</h2>
        <label id="opacity">{opacityValue}</label>
        <input
          id="opacitySlider"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={opacityValue}
          onChange={(e) => setOpacityValue(parseFloat(e.target.value))}
        />
      </div>
      <div className="filter-group">
        <input
          type="checkbox"
          id="sumCheckbox"
          checked={showSum}
          onChange={() => handleCheckboxChange('sum')}
        />
        <label htmlFor="sumCheckbox">Sum</label>
        <input
          type="checkbox"
          id="femaleCheckbox"
          checked={showFemale}
          onChange={() => handleCheckboxChange('female')}
        />
        <label htmlFor="femaleCheckbox">Female</label>
        <input
          type="checkbox"
          id="maleCheckbox"
          checked={showMale}
          onChange={() => handleCheckboxChange('male')}
        />
        <label htmlFor="maleCheckbox">Male</label>
      </div>
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
};

export default App;





