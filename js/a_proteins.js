import * as d3 from "d3";
const proteinColors = {
    "Chicken": "#f3e9cf",
    "Beef": "#df4671",
    "Pork": "#cc483c",
    "Fish": "#dd5e3f",
    "Tofu": "#eadaad",
    "Lamb": "#EE7765",
    "Turkey": "#DAC3A9",
    "Duck": "#E3903D",
    "Egg": "#E9B818",
    "Shrimp": "#f7c5bd",
};

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
const colorScale = d3.scaleOrdinal(cuisine_colors);
const width = window.innerWidth
const height = Math.min(window.innerHeight, width*2.8/5)
const pi_width = window.innerWidth/2
const proteinList = Array.from(Object.keys(proteinColors))

export function proteinPlot(data){
    const root = d3.hierarchy({
        children: data.map(d => ({
          name: d[0],  
          children: d[1].map(sub => ({ name: sub[0], value: sub[1] }))  // subcategories
        }))
      })
      .sum(d => d.value); 

    const treemap = d3.treemap()
        .size([width-pi_width, height]) 
        .padding(1);

    treemap(root);

   
    d3.select(".section1").append('div').attr('class','title').text("Popular Proteins accross Cuisines")
    const plotContainer = d3.select(".section1").style('width', width + 'px')
        .style('min-height', height + 'px').append('div').attr('class', "plot1").style('height', height+'px')
    

    const svg = plotContainer.append('svg')
                .attr('viewBox', [0,0,width-pi_width,height])
                .attr('width', width-pi_width)
                .attr('height', height)
    
    const cuisines = svg.selectAll(".cuisine")
        .data(root.children)
        .enter()
        .append("g")
            .attr("class","cuisine")
            .style('transition',' opacity 0.2s ease')
            .attr('id', (d)=>d.data.name.replace(/ /g, "-"))
            .style('border', '2px solid black')
            .attr("transform", d => `translate(${d.x0}, ${d.y0})`)
        .on('mouseover',(event, d)=>{
            showProteinInfo(d.data.name)
            d3.selectAll(".cuisine").attr('opacity', .5)
            d3.select("#"+d.data.name.replace(/ /g, "-")).attr('opacity', 1).attr('stroke',"black")
            d3.select('#text-'+d.data.name.replace(/ /g, "-")).style('mix-blend-mode', 'normal')
        })
        .on('mouseleave',(event, d)=>{
            d3.selectAll(".cuisine").attr('opacity', 1)
            d3.select('#text-'+d.data.name.replace(/ /g, "-")).style('mix-blend-mode', 'overlay')
            d3.select("#"+d.data.name.replace(/ /g, "-")).attr('opacity', 1).attr('stroke',"none")

        })
        .on('click',(event, d) =>{
            showProteinInfo(d.data.name)
            
        })
    cuisines.append("rect")
            .attr("width", d => d.x1 -d.x0)  
            .attr("height", d => d.y1 - d.y0)  
            .attr('rx', 10)
            .attr('ry', 10)
            .style("fill", d=>{
                return colorScale(d.data.name)
            })         
    cuisines.append("text")
            .attr("x", 5)  
            .attr("y", 20)
            .attr('stroke', 'none')
            .attr('id', (d)=>'text-'+d.data.name.replace(/ /g, "-"))
            .text(d => d.data.name) 
            .attr('class', 'cuisine-text')


    const focusSvg = plotContainer.append('svg')
        .attr('viewBox', [0,0,pi_width,height])
        .attr('width', pi_width -100)
        .attr('height', height -100)
        .attr('transform', `translate(${50}, ${50})`)

    function showProteinInfo(cuisine){
        focusSvg.selectAll("*").remove()
        const cuisineData = data.filter(d=>d[0]==cuisine)[0][1]
        piechart(focusSvg,cuisineData)

    }
    showProteinInfo("Italian")
     

}

function piechart(container, protein_data){
    const formattedData = protein_data.map(d => ({ label: d[0], value: d[1] }));
    const radius = pi_width/2
    const pie_chart_svg = container.append("g").attr("transform", `translate(${radius}, ${radius})`);
    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().outerRadius(radius - 10).innerRadius(0);
    const labelArc = d3.arc()
        .outerRadius(radius -40)
        .innerRadius(radius - 40);

    const arcs = pie_chart_svg.selectAll(".arc")
        .data(pie(formattedData))
        .enter()
        .append("g")
        .attr("class", "arc");

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => proteinColors[d.data.label])
        .attr("class", "slice");


    arcs.append("text")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("dy", ".35em")
        .text(d => d.data.label)
        .attr('class', 'pi-chart-text')
        .style("text-anchor", "middle")
}