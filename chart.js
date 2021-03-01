// Make our API Calls
let unirest = require("unirest");

// Function to call API
async function queryData() {
    let req = unirest("GET", "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-chart");
    req.query({
        "interval": "1d",
        "symbol": document.getElementById("stock_input").value,
        "range": "1y",
        "region": "US"
    });
    req.headers({
        "x-rapidapi-key": "946a51fb3dmsh92e675ab06eff2ep106edbjsn9831853f239f",
        "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
        "useQueryString": true
    });
    req.end(function (response) {
        if (response.error) {
            throw new Error(response.error);
        }
        else {
            data = loadData(response.body);
            createChart(data);
        }
    });
}

// Load data from API
function loadData(data) {
    let chart_results_data = data["chart"]["result"][0];
    let quote_data = chart_results_data["indicators"]["quote"][0];
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

// Compute moving average
function movingAverage(data, numberOfPricePoints) {
    return data.map((row, index, total) => {
        let start = Math.max(0, index - numberOfPricePoints);
        let end = index;
        let subset = total.slice(start, end + 1);
        let sum = subset.reduce((a, b) => a + b['close'], 0);
        return { date: row['date'], average: sum / subset.length };
    });
}

// Initialize chart
function createChart(data) {
    data = data.filter(
        row => row['high'] && row['low'] && row['close'] && row['open']
    );

    // create this_year_start_data
    this_year_start_data = new Date(2018, 0, 1)

    // filter out data based on time period
    data = data.filter(row => {
        if (row['date']) {
            return row['date'] >= this_year_start_data;
        }
    });

    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    let width = window.innerWidth - (margin.left + margin.right);
    let height = window.innerHeight / 2 - (margin.top + margin.bottom);

    // Find data range
    let xMin = d3.min(data, d => d["date"]);
    let xMax = d3.max(data, d => d["date"]);

    let yMin = d3.min(data, d => d["close"]);
    let yMax = d3.max(data, d => d["close"]);

    // Scales for the charts
    let xScale = d3.scaleTime()
        .domain([xMin, xMax])
        .range([0, width]);

    let yScale = d3.scaleLinear()
        .domain([yMin - 5, yMax])
        .range([height, 0]);

    // clear out old svg
    d3.selectAll('#chart > *').remove();

    // add chart SVG to the page
    let svg = d3.select('#chart')
        .append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', `translate(${margin['left']}, ${margin['top']})`);

    // create the axes component
    svg.append('g')
        .attr('id', 'xAxis')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));
    svg.append('g')
        .attr('id', 'yAxis')
        .attr('transform', `translate(${width}, 0)`)
        .call(d3.axisRight(yScale));

    // generates close price line chart when called
    let line = d3.line()
        .x(d => xScale(d['date']))
        .y(d => yScale(d['close']));

    // generates moving average curve when called
    let movingAverageLine = d3.line()
        .x(d => xScale(d['date']))
        .y(d => yScale(d['average']))
        .curve(d3.curveBasis);

    // Append the path and bind data
    svg.append('path')
        .data([data])
        .style('fill', 'none')
        .attr('id', 'priceChart')
        .attr('stroke', 'blue')
        .attr('stroke-width', '1.5')
        .attr('d', line);

    // calculates simple moving average over 50 days
    let movingAverageData = movingAverage(data, 49);
    svg.append('path')
        .data([movingAverageData])
        .style('fill', 'none')
        .attr('id', 'movingAverageLine')
        .attr('stroke', '#FF8900')
        .attr('d', movingAverageLine);

    // renders x and y crosshair
    let focus = svg.append('g')
        .attr('class', 'focus')
        .style('display', 'none');

    focus.append('circle').attr('r', 4.5);
    focus.append('line').classed('x', true);
    focus.append('line').classed('y', true);

    svg.append('rect')
        .attr('class', 'overlay')
        .attr('width', width)
        .attr('height', height)
        .on('mouseover', () => focus.style('display', null))
        .on('mouseout', () => focus.style('display', 'none'))
        .on('mousemove', generateCrosshair);

    d3.select('.overlay').style('fill', 'none');
    d3.select('.overlay').style('pointer-events', 'all');

    d3.selectAll('.focus line').style('fill', 'none');
    d3.selectAll('.focus line').style('stroke', '#67809f');
    d3.selectAll('.focus line').style('stroke-width', '1.5px');
    d3.selectAll('.focus line').style('stroke-dasharray', '3 3');

    //returs insertion point
    let bisectDate = d3.bisector(d => d.date).left;

    /* mouseover function to generate crosshair */
    function generateCrosshair() {
        // returns corresponding value from the domain
        let correspondingDate = xScale.invert(d3.pointer(event, this)[0]);

        // gets insertion point
        let i = bisectDate(data, correspondingDate, 1);
        let d0 = data[i - 1];
        let d1 = data[i];
        let currentPoint = correspondingDate - d0['date'] > d1['date'] - correspondingDate ? d1 : d0;
        focus.attr('transform', `translate(${xScale(currentPoint['date'])}, ${yScale(currentPoint['close'])})`);

        focus.select('line.x')
            .attr('x1', 0)
            .attr('x2', width - xScale(currentPoint['date']))
            .attr('y1', 0)
            .attr('y2', 0);

        focus.select('line.y')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', 0)
            .attr('y2', height - yScale(currentPoint['close']));

        // updates the legend to display the date, open, close, high, low, and volume of the selected mouseover area
        updateLegends(currentPoint);
    }

    /* Legends */
    function updateLegends(currentData) {
        d3.selectAll('.lineLegend').remove();

        let legendKeys = Object.keys(data[0]);
        let lineLegend = svg.selectAll('.lineLegend')
            .data(legendKeys)
            .enter()
            .append('g')
            .attr('class', 'lineLegend')
            .attr('transform', (d, i) => { return `translate(0, ${i * 20})`; });
        lineLegend.append('text')
            .text(d => {
                str_d = String(d)
                str_d = str_d.charAt(0).toUpperCase() + str_d.slice(1);
                if (d === 'date') {
                    return `${str_d}: ${currentData[d].toLocaleDateString()}`;
                }
                else if (d === 'high' || d === 'low' || d === 'open' || d === 'close') {
                    return `${str_d}: ${currentData[d].toFixed(2)}`;
                }
                else {
                    return `${str_d}: ${currentData[d]}`;
                }
            })
            .style('fill', 'black')
            .attr('transform', 'translate(15,9)'); //align texts with boxes
    };

    /* Volume series bars */
    let volData = data.filter(d => d['volume'] !== null && d['volume'] !== 0);

    let yMinVolume = d3.min(volData, d => { return Math.min(d['volume']); });

    let yMaxVolume = d3.max(volData, d => { return Math.max(d['volume']); });

    let yVolumeScale = d3
        .scaleLinear()
        .domain([yMinVolume, yMaxVolume])
        .range([height, height * (3 / 4)]);

    svg.selectAll()
        .data(volData)
        .enter()
        .append('rect')
        .attr('x', d => { return xScale(d['date']); })
        .attr('y', d => { return yVolumeScale(d['volume']); })
        .attr('class', 'vol')
        .attr('fill', (d, i) => {
            if (i === 0) {
                return '#03a678';
            }
            else {
                return volData[i - 1].close > d.close ? 'green' : 'red'; // green bar if price is rising during that period, and red when price  is falling
            }
        })
        .attr('width', 1)
        .attr('height', d => { return height - yVolumeScale(d['volume']); });
}

// Execute code
document.getElementById("enter_button").onclick = queryData;