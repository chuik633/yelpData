import * as d3 from "d3";
import "leaflet";


const mapboxAccessToken = 'pk.eyJ1IjoiY2h1aWs2MzMiLCJhIjoiY20zdGhpbzc1MDh3eTJxcHhvaHN6dGQ1YyJ9.ARosqVuMeqSpdYeSpEsOug';
const hourToStyle = {
   'day':"cm3tiwfqp000e01s01fmf2zoy",
   "dusk":'cm3tibx6e004y01qsc0fihdwp',
   'dark': 'cm3tis2v9004z01qsfuzp4lvt'
}
const days = ['Monday', 'Tuesday', "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const width = window.innerWidth
const height = Math.min(window.innerHeight, width*2/3)

const scrollIncrement = 10
let scrollTop = 0
const fullScrollHeight = 3*7*24*scrollIncrement
const scrollTimeScale = d3.scaleLinear().domain([0,scrollIncrement*24]).range([0,24])
const scrollDayScale = d3.scaleLinear().domain([0, fullScrollHeight]).range([0,7])

const dial_radius = 50
const spoke_width = 10
const spoke_height = 1
const angleScale = d3.scaleLinear().domain([0,24]).range([0,360])

let frontColor = 'white'
let plotMarkerColor = 'white'
let bgColor = 'black'

function hoursDial(){
    const dial_container = d3.select(".plot3").append('div')
            .attr('class', 'dial-container')
            .style('width', `${dial_radius}px`)
            .style('height', `${dial_radius*2}px`)
            .style('top', `${height/2-2*dial_radius}px`)
            .style('left', `${width - 2*dial_radius}px`)
        
    const dial_svg = dial_container.append('svg').attr('id', 'dial-svg')
        .attr('viewBox', [0,0,dial_radius*2,dial_radius*2])
        .attr('width', dial_radius*2)
        .attr('height', dial_radius*2)
        // .style('background-color', 'blue')

         
    
    
    const spoke_inner_width = 30
   
    for(let hour =0; hour<24; hour++){
        const spoke_angle = angleScale(hour)
        dial_svg.append('rect')
            .attr('class', 'spoke' + ` spoke-${hour}`)
            .attr('width', spoke_width)
            .attr('height', spoke_height )
            .attr('fill', 'white')
            .attr('x', dial_radius - (spoke_width + spoke_inner_width))
            .attr('y', dial_radius - (spoke_height))
            .attr('transform',     
                    `rotate(${spoke_angle}, ${dial_radius}, ${dial_radius})` 
            
                 )   
    }
}

export function hoursPlot(data){
    console.log("creating the hours plot")

    const plotContainer =  d3.select(".section3").style('width', width + 'px')
    .style('height', height + 'px').append('div')
        .attr('class', "plot3")
        .style('width', width + 'px')
        .style('height', height + 'px');
    
    const mapContainer = plotContainer.append('div').style('z-index',0).style('overflow-y','scroll')
        .style('width', width + 'px')
        .style('height', height + 'px');
    hoursDial()
   
    
    const map = L.map(mapContainer.node(),
    {
        scrollWheelZoom: false,  
        maxZoom:7,
        dragging: true,
        touchZoom: false, 
        zoomControl: true,
        doubleClickZoom: false, 
        detectRetina: true,
      }).setView([38.0902, -93.7129], 4); 
      //add scroll event to map
      //keep track of scroll value outside

    map.getContainer().addEventListener('wheel', (event) =>{
        if (event.deltaY < 0) {
            scrollTop +=1
          } else {
            scrollTop += -1
          }
          updateTime((scrollTop+ fullScrollHeight)%fullScrollHeight)
    })


    const timeMarker = plotContainer.append('div').attr("class", "time-marker")
    const timeMarkersLayer = L.layerGroup().addTo(map);
    const allValues = Object.values(data).flatMap(day =>
        Object.values(day).flatMap(hourMap => {
            console.log(Array.from(Object.values(hourMap)))
        return Array.from(Object.values(hourMap)).map(entry => entry.count); // Extract values from the InternMap
  
        })
    );
    const max_count =Math.max(...allValues) 
    const rScale = d3.scaleLinear().domain([0,max_count]).range([1,50])
    // const timeMarkersLayer = L.markerClusterGroup().addTo(map);
    function updateTimeMarkers(hour, dayIdx){
        const day = days[dayIdx]
        if(day == 0){
            day = "Monday"
        }
        const openPlacesData = data[day][Math.floor(hour)]
        timeMarkersLayer.clearLayers()
        if(openPlacesData.length ==0 || openPlacesData ==undefined){
            return
        }
        for(const entry of Object.entries(openPlacesData)){
            console.log(entry)
            const num_places = entry[1].count
            const avg_lat= Math.round(entry[1].avg_lat * 100) / 100
            const avg_long=  Math.round(entry[1].avg_long * 100) / 100
            console.log(avg_lat, avg_long, num_places)

            const marker = L.circleMarker(
                [avg_lat, avg_long],{
                radius: rScale(num_places),
                fillColor: plotMarkerColor,
                fillOpacity: .4,
                weight: 1,
                color:  plotMarkerColor
            }).addTo(map);
            // const customMarker = L.marker([avg_lat, avg_long], {
            //     icon: L.divIcon({
            //         className: 'custom-marker',
            //         html: `<div style="
            //         background-color: rgba(${parseInt(plotMarkerColor.slice(1, 3), 16)}, 
            //                                ${parseInt(plotMarkerColor.slice(3, 5), 16)}, 
            //                                ${parseInt(plotMarkerColor.slice(5, 7), 16)}, 0.3);; 
            //         width: ${rad}px; 
            //         height: ${rad}px; 
            //         border-radius: 100px; 
            //         opacity:1; 
            //         border: 1px solid rgba(${parseInt(plotMarkerColor.slice(1, 3), 16)}, 
            //                                ${parseInt(plotMarkerColor.slice(3, 5), 16)}, 
            //                                ${parseInt(plotMarkerColor.slice(5, 7), 16)}, 1); 
                    
            //       "></div>`,
            //         iconSize: [rad, rad]
            //     })
            // }).addTo(map);
            timeMarkersLayer.addLayer(marker)

          
            
        }
        map.addLayer(timeMarkersLayer)
    }
    

    
    let currentTimeBucket = ''
    let currentHour = 0
    function updateTime(scroll_amount){
        const hour = scrollTimeScale(scroll_amount)%24
        const day = Math.floor(scrollDayScale(scroll_amount))
        const min = Math.floor((hour -  Math.floor(hour))*60)
        const timeBucket = getTimeBucket(hour)
       

        //updating the text
       frontColor = 'white'
        bgColor = 'black'
        plotMarkerColor='white'
        if(timeBucket == 'day'){
            frontColor = 'black'
            bgColor = 'white'
            plotMarkerColor= '#EF9967'
        }
        timeMarker.text(`${days[day%7]}: ${Math.floor(hour)}:${min}`).style('color', bgColor).style('background-color', frontColor)

        //update the dial
        d3.select("#dial-svg")
            .attr('transform',`translate(${dial_radius}, ${dial_radius}) rotate(${-angleScale(hour)})`)   
        d3.selectAll('.spoke').attr('width', spoke_width).attr('height', spoke_height).attr('fill', frontColor)
        d3.selectAll('.spoke-' + Math.floor(hour)).attr('height', 2).attr('width', spoke_width + 30)

        //updating the map style
        if(currentTimeBucket != timeBucket){
            d3.select('.leaflet-control-zoom-in').style('color', bgColor).style('background-color', frontColor)
            d3.select('.leaflet-control-zoom-out').style('color', bgColor).style('background-color', frontColor)
            currentTimeBucket=timeBucket
            const styleID = hourToStyle[timeBucket]
            const tileLayerLink = `https://api.mapbox.com/styles/v1/chuik633/{style_id}/tiles/{z}/{x}/{y}?access_token=${mapboxAccessToken}`
            const tileLayer = L.tileLayer(tileLayerLink, {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                style_id:styleID,
                tileSize: 512,
                zoomOffset: -1,
                maxZoom: 18,
            }).addTo(map);
            map.addLayer(tileLayer)
        }

         //update the map contents
        if(currentHour != Math.floor(hour)){
            updateTimeMarkers(hour, day)
            currentHour = Math.floor(hour)
        }
       
        
    }
    updateTime(0)

   
    
}



function getLatLong(latlong_string){
    const [lat,long] = latlong_string.split(' ')
    return [parseInt(lat), parseInt(long)]
}
function getTimeBucket(hour) {
    if (hour >= 6 && hour < 18) {
        return 'day'; 
    } else if (hour >= 18 && hour < 20) {
        return 'dusk'; 
    } else {
        return 'dark'; 
    }
}