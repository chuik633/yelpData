import * as d3 from "d3";
import "leaflet";
const width = window.innerWidth
const sidebarWidth = 300
const height = Math.min(window.innerHeight, width*2/3)
const mapboxAccessToken = 'pk.eyJ1IjoiY2h1aWs2MzMiLCJhIjoiY20zdGhpbzc1MDh3eTJxcHhvaHN6dGQ1YyJ9.ARosqVuMeqSpdYeSpEsOug';
const cuisine_colors = [
    '#d2db76',
    '#ffc3cc',
    '#eba3b9',
    '#f8edd8',
    '#ff4e20',
    '#aacdfe',
    '#b5e1e2',
    '#2225d8',
    '#e1d6fc',
    '#bae7aa',
    '#d8d81e',
    '#583f30',
    '#E9B818',
    '#DEDDB7'
]

export function cuisineMapPlot(data){
    const cuisine_list = Array.from(data.keys())
    const colorScale = d3.scaleOrdinal().domain(cuisine_list).range(cuisine_colors);

    const plotContainer =  d3.select(".section4").style('width', width + 'px').style('height', height + 'px')
        .append('div')
            .attr('class', "plot4")
            .style('width', width + 'px')
            .style('height', height + 'px');

    const mapContainer = plotContainer.append('div').attr('class', 'map-container')
        .style('width', width-sidebarWidth + 'px')
        .style('height', height + 'px');
    const map = L.map(mapContainer.node(),
        {   
            scrollWheelZoom: false,  
            maxZoom:15,
            dragging: true,
            touchZoom: false, 
            zoomControl: true,
            doubleClickZoom: false, 
            detectRetina: true,
          }).setView([39.9526, -75.1652], 12); 

    const tileLayerLink = `https://api.mapbox.com/styles/v1/chuik633/{style_id}/tiles/{z}/{x}/{y}?access_token=${mapboxAccessToken}`
            const tileLayer = L.tileLayer(tileLayerLink, {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                style_id:"cm448r67k00te01qqhbn6fxzt",
                tileSize: 512,
                zoomOffset: -1,
                maxZoom: 18,
            }).addTo(map);
    map.addLayer(tileLayer)
    const markersLayer = L.layerGroup().addTo(map);
    function updateMap(selectedCuisines){
        markersLayer.clearLayers()
        for(const entry of data.entries()){
            const cuisine = entry[0]
            if(selectedCuisines.includes(cuisine)){
                for(const d of entry[1]){
                    // console.log(d)
                    const marker =  L.circleMarker(
                        [d.latitude, d.longitude],{
                        radius: 1,
                        fillColor: colorScale(cuisine),
                        fillOpacity: .6,
                        weight: 0,
                        color: colorScale(cuisine)
                    })
                    markersLayer.addLayer(marker)
         
                }  
            }
        }
        map.addLayer(markersLayer)

    }
    

    const tooltip = plotContainer.append('div').attr('class', 'tooltip')
    const sidebar = plotContainer.append('div').attr('class', 'sidebar').style('width', `${sidebarWidth}px`).style('height', `${height}px`)
    const legend = sidebar.append('div').attr('class', 'legend')
    sidebar.append('h2').text("Cuisine Clusters")
    const legend_entry = legend.selectAll('div')
        .data(cuisine_list).enter()
        .append('div')
        .attr('selected', 'false')
        .attr('class', 'legend-entry')
        .style('width', `200px`)
        .style('height', `20px`)
    legend_entry.append('div')
        .style('width', `15px`)
        .style('height', `15px`)
        .style('background-color', d=> colorScale(d))
    legend_entry.append('h4').text(d=>d)

    legend_entry
        .on('mouseover', function(event, d){
            d3.select(this).style('border', '1px solid #583f30')
        })
        .on('mouseleave', function(event, d){
            if(d3.select(this).attr('selected') == 'false'){
                d3.select(this).style('border', 'none')
            }
        })
        .on('click', function(event, d){
            if(d3.select(this).attr('selected') == 'true'){ //deselect it
                d3.select(this)
                    .attr('selected','false')
                    .style('border', 'none')

            }else{//select it
                d3.select(this)
                    .attr('selected','true')
                    .style('border', '1px solid #583f30')
            }

            const selectedList = d3.selectAll('.legend-entry')
                .filter(function() {
                    return d3.select(this).attr('selected') === 'true'; 
                }).nodes().map(function(el) {
                    return d3.select(el).datum();  
                });
            console.log(selectedList)
            updateMap(selectedList)
        })

        updateMap(cuisine_list)

}

// // Function to get region boundaries using Nominatim API
// async function getRegionBoundary(lat, lon) {
//     const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;

//     try {
//         const response = await fetch(url);
//         const data = await response.json();

//         console.log('data', data);
//         if (data && data.boundingbox) {
//             const boundingBox = data.boundingbox;
//             console.log('Bounding box:', boundingBox);

//             const north = parseFloat(boundingBox[0]);
//             const south = parseFloat(boundingBox[1]);
//             const east = parseFloat(boundingBox[2]);
//             const west = parseFloat(boundingBox[3]);

//             const polygonCoordinates = [
//                 [north, west],
//                 [north, east],
//                 [south, east],
//                 [south, west]
//             ];
//             console.log('Polygon Coordinates:', polygonCoordinates);

//             return polygonCoordinates;
//         }
//     } catch (error) {
//         console.error('Error fetching region boundary:', error);
//     }
//     return null;
// }