function createStakeGraph(container_width, container_height) {
    // Load state
    let symbols = myState.selected_stocks;
    let initial_stakes = myState.initial_stakes;
    let all_data = myState.selected_stocks.map(x => myState.stock_data[x].map(y => y["close"]));
    let dates = myState.dates;

    // Delete previous graph
    let chart2 = document.getElementById("chart-2");
    chart2.innerHTML = '';

    // Set up container
    let svg = d3.select(chart2)
        .append("svg")
        .attr("id", "svg2_id")
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

    /* Extract important info from data */
    let relevant_data = [];
    for (let i = 0; i < all_data[0].length; i++) {
        let weighted_sum = 0;
        for (let j = 0; j < symbols.length; j++) {
            weighted_sum += initial_stakes[j] * (all_data[j][i] / all_data[j][0]);
        }
        relevant_data.push([dates[i], weighted_sum]);
    }


    let minX = d3.min(relevant_data, d => d[0]);
    let maxX = d3.max(relevant_data, d => d[0]);
    let minY = d3.min(relevant_data, d => d[1]);
    let maxY = d3.max(relevant_data, d => d[1]);

    /* Create scales/axes */
    let xScale = d3.scaleTime()
        .range([0, width])
        .domain([minX, maxX]);

    let yScale = d3.scaleLinear()
        .range([height, 2])
        .domain([minY, maxY]);

    let line = d3.line()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]));

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
        .text("Total Stake Worth (USD)");

    g.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr('x', 0)
        .attr('y', 0)
        .attr("width", width)
        .attr("height", height);

    /* Plot line and circles */
    let main = g.append('g')
        .attr("class", "main")
        .attr("clip-path", "url(#clip)");

    main.append("path")
        .datum(relevant_data)
        .attr('d', line)
        .attr("stroke", "purple")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("class", "line")
        .attr("pointer-events", "none");

    main.selectAll(".circle")
        .data(relevant_data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d[0]))
        .attr("cy", d => yScale(d[1]))
        .attr('r', 2)
        .attr("fill", "white")
        .attr("stroke", "purple")
        .attr("stroke-width", 1)
        .attr("class", "circles");

    /* Voronoi diagram */
    let voronoi_diagram = d3.voronoi()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]))
        .size([container_width, container_height])(relevant_data);

    let voronoi_radius = width;

    /* Focus, Tooltip, & Overlay */
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

    svg.select(".overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", () => {
            focus.style("display", null);
            tooltip.style("display", null);
        })
        .on("mouseout", () => {
            focus.style("display", "none");
            tooltip.style("display", "none");
        })
        .on("mousemove", function (event) {
            let [mx, my] = d3.pointer(event, this);

            let site = voronoi_diagram.find(mx, my, voronoi_radius);
            if (site) {
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
            .size([container_width, container_height])(relevant_data);
    }
}