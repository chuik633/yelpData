import * as d3 from "d3";
import {get_sentiment, theme_keywords} from "./data.js"
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@5.0.0/lib/marked.esm.min.js';
const sentimentWord = {
    "-3":"very bad", //netagive -3
    "-2":"bad", // -2
    "-1":"bad(ish)", //-1
    "0":"neutral",//neutral
    "1":"positive(ish)", //1
   "2":"positive", //2
   "3":"very positive"//positive 3
}
export function sentimentPlot(data){
    const width = window.innerWidth
    const height = Math.min(window.innerHeight, width*3/5)
    const sidebarWidth = width/3
    const plotContainer = d3.select(".section2")
        .style('width', width + 'px')
        .style('height', height + 'px')
        .append('div').attr('class', "plot2").style('height', height+"px")
    
    const svg = plotContainer.append('svg')
                .attr('viewBox', [0,0,width-sidebarWidth,height])
                .attr('width', width-sidebarWidth)
                .attr('height', height)
                // .style('border', '1px solid black');
    plotContainer.append('div').attr('class', 'title').text('Yelp Review Subjects and Sentiments')
    const tooltip = plotContainer.append("div").attr('class', 'tooltip').style('display', 'none')
    const reviewPreviewBox = plotContainer.append("div").attr('class', 'review-preview-box').style('height', height+"px").style('width', sidebarWidth+"px")
    


    //xscale

    const allSentiment_vals = Array.from(data).map(d=>Object.entries(d)[0][1])
    const min_Sentiment = d3.min(allSentiment_vals)
    const max_Sentiment = d3.max(allSentiment_vals)
    console.log(min_Sentiment, max_Sentiment)
  
    const xScale = d3.scaleLinear().domain([min_Sentiment, max_Sentiment]).range([20,width-sidebarWidth-100])

    //radius scale
    const max_radius = 50
    let allCounts= []
    for(const entry of data){
        if(entry[0] != undefined){
            for(const entry2 of entry[1]){
                const [label, count] = Object.entries(entry2).map(d=>d[1])
                allCounts.push(count.length)
            }
        } 
    }
    
    const max_count = Math.max(...allCounts)
    console.log(allCounts)
    console.log("max_count",max_count)
    const rScale = d3.scaleLinear().domain([0,max_count]).range([4, max_radius])
    
    const colorScaleColors = {
        "-3":"#E6574E", //netagive -3
        "-2":"#EC7972", // -2
        "-1":"#EF9B96", //-1
        "0":"#F1EDE1",//neutral
        "1":"#EAECBF", //1
       "2":"#D8DD7F", //2
       "3":"#CBD247"//positive 3
    }

    
    function colorScale(sentiment){
        return colorScaleColors[String(sentiment)]

    } 
    
    //d3 force to set up layout
    let nodes = []
    for(const entry of data){
        const sentiVal = entry[0]
        const sentiMap = entry[1]
        for(const entry of sentiMap){
            const [label, count] = Object.entries(entry).map(d=>d[1])
            if(sentiVal != undefined){
                nodes.push({
                    sentiment: sentiVal,
                    label: label,
                    count: count.length,
                    reviews: count,
                    radius: rScale(count.length),
                    y: height/2,
                    x:xScale(sentiVal)
                })
            }
            

        }
    }
    console.log(nodes)
    const sim = d3.forceSimulation(nodes)
        .force('collide', d3.forceCollide(d=>d.radius+2))
        .force("y", d3.forceY(d => d.y).strength(0.1)) 
        .force('charge', d3.forceManyBody().strength(-1))
        .force('x', d3.forceX(d => d.x).strength(0.1))
        

    const node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("circle")
        .attr("class", d=>`node sent-${d.sentiment} ${d.label.replace(/ /g, "-")}`)
        .attr("r", d => d.radius) 
        .attr('cy', d=> d.y)
        .attr('cx', d=>{
            // console.log(d.sentiment, xScale(d.sentiment), d.x)
            return d.x})
        .style('fill', d=> {
            if(d.sentiment == '0'){
                return colorScale(d.sentiment)
            }else{
                return `url(#sent-${d.sentiment})`
            }})
        .each(function(d) {
                const patternId = `sentiment-pattern-${d.sentiment}-${d.radius}`;
                const pattern = svg.append("defs").append("pattern")
                    .attr("id", patternId)
                    .attr("patternUnits", "objectBoundingBox")
                    .attr("width", 1)  
                    .attr("height",1) 
                    .append("image")
                    .attr("preserveAspectRatio", "xMidYMid meet")
                    .attr("href", `./assets/images/sentiments/${d.sentiment}.png`) 
                    .attr("width",d.radius*2)  
                    .attr("height", d.radius*2); 
        
                
                d3.select(this).style("fill", `url(#${patternId})`);
            })
        .on('mouseover', (event, d)=>{
            d3.selectAll('.node').attr('opacity', 0.2).style('stroke', 'none')
            d3.selectAll(`.sent-${d.sentiment}`).attr('opacity', 0.5)
            d3.selectAll(`.${d.label.replace(/ /g, "-")}`).style('stroke', "black").attr('opacity', 0.8).style('stroke-width', ".5px")
            d3.selectAll(`.sent-${d.sentiment}.${d.label.replace(/ /g, "-")}`).attr('opacity', 1).style('stroke', "black").style('stroke-width', "2px")
            
            tooltip.text(`${d.label}`).style('top', `${d.y - d.radius - 10}px`).style('left', `${d.x}px`).style('display', 'inherit')
        })
        .on('mouseleave', (event, d) =>{
            d3.selectAll('.node').attr('opacity', 1).style('stroke', 'none')
            tooltip.style('display', 'none')
        })
        .on('click',(event,d)=>{
            reviewPreviewBox.selectAll("*").remove()
            reviewPreviewBox.append('h3').text(`${sentimentWord[d.sentiment]} reviews about ${d.label}`)
            const max_reviews = 10;
            
            for(let review_count = 0; review_count<max_reviews && review_count<d.reviews.length; review_count++){
                console.log(d.reviews[review_count].text)
                const reviewContainer = reviewPreviewBox.append('div').attr('class', 'review')
                const innerText =  layoutReview(d.reviews[review_count].text, d.label)
                reviewContainer.html(innerText)
            
            }
        })

    sim.on("tick", () => {
            node
                .attr("cx", d => d.x )
                .attr("cy", d => d.y);
        });
           
}

function layoutReview(text, label){
    let themeWords = theme_keywords[label]
    let words = text.split(' ');
    let outputString = ''
    for(const word of words){
        const punctuation = word.match(/[^\w\s]/g)
        if(punctuation){
            let word1 = word.split(/[^\w\s]/g)[0]
            let word2 =word.split(/[^\w\s]/g)[1]
            if(themeWords.includes(word1)){
                outputString+= "**" + word1 +"**" + punctuation[0]
            }else{
                outputString += word1 + punctuation[0]
            }
            if(themeWords.includes(word2)){
                outputString+= "**" + word2 +"** " 
            }else{
                outputString += word2 + ' '
            }
        }else{
            if(themeWords.includes(word)){
                outputString+= "**" + word +"** "
            }else{
                outputString += word + " "
            }
        }

       
    }
    return marked(outputString.trim())

}