// Compute moving average over every stock
function movingAverage(data, numberOfPricePoints) {
    let dates = [];
    let averages = new Array(data[0].length).fill(0);

    // Add dates to variable and compute sum over every stock per date
    for (let j = 0; j < data[0].length; j++) {
        dates.push(data[0][j][0]);
        for (let i = 0; i < data.length; i++) {
            averages[j] += data[i][j][1];
        }
    }

    // Return the moving average
    return averages.map((row, index, total) => {
        let start = Math.max(0, index - numberOfPricePoints);
        let end = index;
        let subset = total.slice(start, end + 1);
        let sum = subset.reduce((a, b) => a + b, 0);
        return [dates[index], sum / (subset.length * data.length)];
    });
}

// Create closing stock price comparison chart
function createChart(container_width, container_height) {
    /* Header */
    // Load state
    let symbols = myState.selected_stocks;
    let data = symbols.map(x => myState.stock_data[x]);

    // Clear out previous chart
    document.getElementById("chart").innerHTML = '';

    // Return if no data
    if (!symbols.length) {
        return;
    }

    // Create chatbot message
    document.getElementById("chat_message").innerHTML = "This is your stock chart!\
    \"Closing price\" tells you the price of a stock at the end of trading that day.\
    Click and drag to select the time period you are interested in. Double click to reset zoom.";

    /* Set up container */
    let svg = d3.select(document.getElementById("chart"))
        .append("svg")
        .attr("id", "svg_id")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${container_width} ${container_height}`)
        .attr("class", "svg-content-responsive");

    let margin = { top: 25, left: 50, bottom: 50, right: 100 };

    let height = container_height - margin.top - margin.bottom;
    let width = container_width - margin.right - margin.left;

    let g = svg.append('g')
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .attr("overflow", "hidden")
        .attr("pointer-events", "all");

    /* Extract relevant info from data */
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

    /* Focus, Tooltip, & Overlay */
    // Create focus with circle and lines
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

    // Create tooltip
    let tooltip = g.append('g')
        .style("display", "none");

    tooltip.append("rect")
        .attr("id", "tooltip_rect")
        .attr("class", "tooltip_rect")
        .attr("rx", 5);
    tooltip.append("text")
        .attr("id", "tooltip_text_date")
        .attr("fill", "rgb(0, 0, 0)")
        .attr("font-size", "0.75em")
        .attr("text-anchor", "middle");
    tooltip.append("text")
        .attr("id", "tooltip_text_price")
        .attr("fill", "rgb(0, 0, 0)")
        .attr("font-size", "0.75em")
        .attr("text-anchor", "middle");

    // Produce an overlay on top of the svg
    svg.select(".overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", () => {
            // Don't do anything on mouseover
            focus.style("display", null);
            tooltip.style("display", null);
        })
        .on("mouseout", () => {
            // Hide the focus and tooltip on mouseout
            focus.style("display", "none");
            tooltip.style("display", "none");
        })
        .on("mousemove", function (event) {
            // Get current mouse coordinate
            let [mx, my] = d3.pointer(event, this);

            // Find coordinates based on voronoi diagram
            let site = voronoi_diagram.find(mx, my, voronoi_radius);
            if (site) {
                let x = site[0];
                let y = site[1];

                // Produce the focus circle and lines
                focus.select("#focusCircle")
                    .attr("cx", x)
                    .attr("cy", y);
                focus.select("#focusLineX")
                    .attr("x1", x).attr("y1", yScale(yScale.domain()[0]))
                    .attr("x2", x).attr("y2", yScale(yScale.domain()[1]));
                focus.select("#focusLineY")
                    .attr("x1", xScale(xScale.domain()[0])).attr("y1", y)
                    .attr("x2", xScale(xScale.domain()[1])).attr("y2", y);

                // Produce the tooltip
                tooltip.attr(`transform`, `translate(${(x - 75)}, ${(y + 10)})`);
                tooltip.select("#tooltip_text_date")
                    .text(`${d3.timeFormat("%x")(xScale.invert(x))}`)
                    .attr('x', 32.5)
                    .attr('y', 10.5);
                tooltip.select("#tooltip_text_price")
                    .text(`$${yScale.invert(y).toFixed(2)}`)
                    .attr('x', 32.5)
                    .attr('y', 25);
                tooltip.select("#tooltip_rect")
                    .attr('x', 0)
                    .attr('y', 0);
            }
        })
        .on("dblclick", () => {
            // Reset on double click
            xScale.domain([minX, maxX]);
            zoom();
        });

    // Upon the brush ending
    function brushEnded(event) {
        document.getElementById("portfolio-button").display = "flex";
        document.getElementById("chat_message").innerHTML = "Now that you know what your stock[s] look like,\
         start your portfolio by putting some money into it and seeing what would happen to it in a given time period!\
         (We capped the input at $10,000 since you're new.)"
        document.getElementById("portfolio").style.display = "flex";
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

    // Zoom in on the sector defined by the brush
    function zoom() {
        let t = svg.transition().duration(750);

        // Update axes, circles, and lines
        svg.select(".axis--x")
            .transition(t)
            .call(xAxis);
        g.select(".axis--y")
            .transition(t)
            .call(yAxis);
        g.selectAll(".circles")
            .transition(t)
            .attr("cx", d => xScale(d[0]))
            .attr("cy", d => yScale(d[1]));
        g.selectAll(".line")
            .transition(t)
            .attr("d", d => line(d));

        // Update voronoi diagram for focus
        voronoi_diagram = d3.voronoi()
            .x(d => xScale(d[0]))
            .y(d => yScale(d[1]))
            .size([container_width, container_height])(vorData);
    }
}