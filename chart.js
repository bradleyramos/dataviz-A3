// Make our API Calls
let unirest = require("unirest");

// Execute code
document.getElementById("enter_button").onclick = driver;

async function driver() {
    document.getElementById("portfolio").style.display = "flex";
    let symbols = document.getElementById("submit-stocks").innerHTML.split(',');
    let data = [];
    for (let i = 0; i < symbols.length; i++) {
        // call API data
        // let promise = new Promise((resolve, reject) => queryData(resolve, reject, symbols[i]));
        // call static data (AQUA, BB, BOX) only works with those three
        let promise = new Promise((resolve, reject) => queryStaticData(resolve, reject, symbols[i]));
        let stock_data = await promise;
        data.push(stock_data);
    }
    createChart(symbols, data);
}

// Function to fetch static data (save some API usage lol)
function queryStaticData(resolve, reject, symbol) {
    let data_route = '/datasets/' + symbol + '.json';
    fetch(data_route)
    .then(response => response.json())
    .then(json => {
        document.getElementById("chat_message").innerHTML = "This is your stock chart! \'Closing price \' tells you the price of a stock at the end of trading that day. Click and drag to select the time period you are interested in. Double click to reset zoom."
        if (json == null) {
            document.getElementById("chart").innerHTML = "Invalid stock symbol";
            reject(new Error("Invalid stock symbol"));
        }
        else {
            document.getElementById("chart").innerHTML = '';
            data = loadData(json);
            resolve(data);
        }
    });
}

// Function to call API
function queryData(resolve, reject, symbol) {
    // Access API
    let req = unirest("GET", "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-chart");

    // Establish headers
    req.headers({
        "x-rapidapi-key": "68b075bfbcmsh43a16a4405f3683p162f24jsn44054627f8af",
        "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
        "useQueryString": true
    });

    // Query Data
    req.query({
        "interval": "1d",
        "symbol": symbol,
        "range": "1y",
        "region": "US"
    });

    // Upon getting a response...
    req.end(function (response) {
        if (response.error) {
            reject(response.error);
        }
        else {
            console.log(response.body);
            document.getElementById("chat_message").innerHTML = "This is your stock chart! \'Closing price \' tells you the price of a stock at the end of trading that day. Click and drag to select the time period you are interested in. Double click to reset zoom."
            data = loadData(response.body);
            if (data == null) {
                document.getElementById("chart").innerHTML = "Invalid stock symbol";
                reject(new Error("Invalid stock symbol"));
            }
            else {
                document.getElementById("chart").innerHTML = '';
                resolve(data);
            }
        }
    });
}

// Load data from API
function loadData(data) {
    let chart_results_data = data["chart"]["result"][0];
    let quote_data = chart_results_data["indicators"]["quote"][0];
    if (quote_data && Object.keys(quote_data).length == 0 && quote_data.constructor == Object) {
        return null;
    }
    else {
        return chart_results_data["timestamp"]
            .map((time, index) => ({
                date: new Date(time * 1000),
                high: quote_data["high"][index],
                low: quote_data["low"][index],
                open: quote_data["open"][index],
                close: quote_data["close"][index],
                volume: quote_data["volume"][index]
            }));
    }
}

// Compute moving average
function movingAverage(data, numberOfPricePoints) {
    let dates = [];
    let averages = new Array(data[0].length).fill(0);
    for (let j = 0; j < data[0].length; j++) {
        dates.push(data[0][j][0]);
        for (let i = 0; i < data.length; i++) {
            averages[j] += data[i][j][1]
        }
    }

    return averages.map((row, index, total) => {
        let start = Math.max(0, index - numberOfPricePoints);
        let end = index;
        let subset = total.slice(start, end + 1);
        let sum = subset.reduce((a, b) => a + b, 0);
        return [dates[index], sum / (subset.length * data.length)];
    });
}

// Create chart
function createChart(symbols, data) {
    /* Setup container */
    const container_width = 750;
    const container_height = 400

    let old_svg = document.getElementById("svg_id");
    if (old_svg) {
        old_svg.remove();
        document.getElementById("tooltip").remove();
    }
        
    let svg = d3.select(document.getElementById("chart"))
        .append("svg")
        .attr("id", "svg_id")
        .attr("width", container_width)
        .attr("height", container_height);

    let margin = { top: 50, left: 50, bottom: 50, right: 100 };

    let height = container_height - margin.top - margin.bottom;
    let width = container_width - margin.right - margin.left;

    let g = svg.append('g')
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .attr("overflow", "hidden")
        .attr("pointer-events", "all");

    /* Extract important info from data */
    let relevant_data = [];
    for (let i = 0; i < data.length; i++) {
        let stock = data[i];
        let relevant_stock = [];
        for (let j = 0; j < stock.length; j++) {
            let row = stock[j];
            relevant_stock.push([row["date"], row["close"]]);
        }
        relevant_data.push(relevant_stock);
    }

    let minX = d3.min(relevant_data, d => d3.min(d, e => e[0]));
    let maxX = d3.max(relevant_data, d => d3.max(d, e => e[0]));
    let minY = d3.min(relevant_data, d => d3.min(d, e => e[1]));
    let maxY = d3.max(relevant_data, d => d3.max(d, e => e[1]));

    /* Create scales/axes/brush */
    let xScale = d3.scaleTime()
        .range([0, width])
        .domain([minX, maxX]);

    let yScale = d3.scaleLinear()
        .range([height, 2])
        .domain([minY, maxY]);

    let line = d3.line()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]));

    let colors = d3.scaleOrdinal()
        .domain([0, relevant_data.length])
        .range(d3.schemeCategory10);

    let xAxis = d3.axisBottom(xScale);
    let yAxis = d3.axisLeft(yScale);

    /* Create brush */
    let brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", brushEnded);
    let idleTimeout;
    let idleDelay = 350;

    svg.append('g')
        .attr("class", "brush")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .call(brush);

    /* Plot axes */
    g.append('g')
        .attr("class", "axis--x")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);

    g.append('g')
        .attr("class", "axis--y")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "rgb(54, 54, 54)")
        .attr("font-size", "1.2em")
        .text("Closing Price (USD)");

    g.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr('x', 0)
        .attr('y', 0)
        .attr("width", width)
        .attr("height", height);

    /* Plot legend */
    let legend = svg.selectAll(".lineLegend")
        .data(symbols)
        .enter()
        .append('g')
        .attr("class", "lineLegend")
        .attr("transform", (d, i) => `translate(${(width + margin.right * 0.75)}, ${(margin.top + i * 20)})`);

    legend.append("text")
        .text(d => d)
        .attr("transform", "translate(15, 9)");

    legend.append("rect")
        .attr("fill", (d, i) => colors(i))
        .attr("width", 10)
        .attr("height", 10);

    /* Plot line and circles */
    let main = g.append('g')
        .attr("class", "main")
        .attr("clip-path", "url(#clip)");

    for (let i = 0; i < relevant_data.length; i++) {
        main.append("path")
            .datum(relevant_data[i])
            .attr('d', line)
            .attr("stroke", d => colors(i))
            .attr("stroke-width", 2)
            .attr("fill", "none")
            .attr("class", "line")
            .attr("pointer-events", "none");

        main.selectAll(".circle")
            .data(relevant_data[i])
            .enter()
            .append("circle")
                .attr("cx", d => xScale(d[0]))
                .attr("cy", d => yScale(d[1]))
                .attr('r', 2)
                .attr("fill", "white")
                .attr("stroke", d => colors(i))
                .attr("stroke-width", 1)
                .attr("class", "circles");
    }

    /* Plot moving average */
    main.append("path")
        .datum(movingAverage(relevant_data, 49))
        .attr('d', line)
        .attr("stroke", "orange")
        .style("stroke-dasharray", ("3, 3"))
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("class", "line");

    /* Voronoi diagram */
    let vorData = d3.merge(relevant_data);

    let voronoi_diagram = d3.voronoi()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]))
        .size([container_width, container_height])(vorData);

    let voronoi_radius = width;

    /* Focus & Overlay */
    let focus = g.append('g')
        .style("display", "none");

    focus.append("line")
        .attr("id", "focusLineX")
        .attr("class", "focusLine");
    focus.append("line")
        .attr("id", "focusLineY")
        .attr("class", "focusLine");
    focus.append("circle")
        .attr("id", "focusCircle")
        .attr('r', 2)
        .attr("class", "circle focusCirle");

    let tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .attr("id", "tooltip")
        .style("opacity", 0);
    
    g.on("mouseout", () => {
        tooltip.transition()
                .duration(500)
                .style("opacity", 0);
             });

    svg.select(".overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", () => { focus.style("display", null); })
        .on("mouseout", () => { 
            focus.style("display", "none")})
        .on("mousemove", function (event) {
            let [mx, my] = d3.pointer(event, this);

            let site = voronoi_diagram.find(mx, my, voronoi_radius);

            let x = site[0];
            let y = site[1];

            focus.select("#focusCircle")
                .attr("cx", x)
                .attr("cy", y);
            focus.select("#focusLineX")
                .attr("x1", x).attr("y1", yScale(yScale.domain()[0]))
                .attr("x2", x).attr("y2", yScale(yScale.domain()[1]));
            focus.select("#focusLineY")
                .attr("x1", xScale(xScale.domain()[0])).attr("y1", y)
                .attr("x2", xScale(xScale.domain()[1])).attr("y2", y);
                
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html(`${d3.timeFormat("%x")(xScale.invert(x))}<br/>$${yScale.invert(y).toFixed(2)}`)
                //.style("left", (margin.left + x) + "px")
                //.style("top", -(margin.top  + y) + "px");
        })
        .on("dblclick", () => {
            xScale.domain([minX, maxX]);
            zoom();
        });

    /* Brushing for zooming */
    function brushEnded(event) {
        let selection = event.selection;
        if (selection === null) {
            if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
            xScale.domain([minX, maxX]);
        }
        else {
            xScale.domain([xScale.invert(selection[0]), xScale.invert(selection[1])]);
            svg.select(".brush").call(brush.move, null);
        }
        zoom();
    }

    function idled() {
        idleTimeout = null;
    }

    function zoom() {
        let t = svg.transition().duration(750);

        svg.select(".axis--x").transition(t).call(xAxis);
        g.select(".axis--y").transition(t).call(yAxis);
        g.selectAll(".circles").transition(t)
            .attr("cx", d => xScale(d[0]))
            .attr("cy", d => yScale(d[1]));
        g.selectAll(".line").transition(t)
            .attr("d", d => line(d));

        voronoi_diagram = d3.voronoi()
            .x(d => xScale(d[0]))
            .y(d => yScale(d[1]))
            .size([container_width, container_height])(vorData);
    }
}