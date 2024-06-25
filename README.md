# React Mapbox GL Heatmap Visualization

This React application utilizes Mapbox GL JS to visualize geographical data with heatmap layers. It allows users to filter heatmap data based on dates and toggle visibility for different data categories.

## Features

- Display a map using Mapbox GL JS.
- Visualize heatmap layers for different data categories (e.g., Sum, Female, Male).
- Filter heatmap data based on selected dates.
- Adjust the opacity of heatmap layers.
- Restrict map panning and zooming to a predefined geographical area using `maxBounds`.

## Prerequisites

Before running the application, ensure you have the following:

- Node.js installed on your machine.
- Mapbox access token. You can obtain a token by signing up at [Mapbox](https://www.mapbox.com/).
- GeoJSON data files:
  - `generator.geojson`: GeoJSON file containing point data for heatmap visualization.
  - `lasithi_boundaries.geojson`: GeoJSON file defining boundaries to restrict heatmap visualization.

