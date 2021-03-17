// Make our API Calls
let unirest = require("unirest");

// Bind function to window
window.driver = driver;

async function driver(symbol) {
    // Get stock data
    if (!Object.keys(myState.stock_data).includes(symbol)) {
        // call API data
        let promise = new Promise((resolve, reject) => queryData(resolve, reject, symbol));

        // call static data (AQUA, BB, BOX) only works with those three
        //let promise = new Promise((resolve, reject) => queryStaticData(resolve, reject, symbol));

        let stock_data = await promise;

        // Store data in state
        myState.stock_data[symbol] = stock_data;

        // Get date data
        if (!myState.length) {
            myState.dates = stock_data.map(x => x["date"]);
        }
    }
}

/*
// Function to fetch static data (save some API usage lol)
function queryStaticData(resolve, reject, symbol) {
    let data_route = '/static_datasets/' + symbol + '.json';
    fetch(data_route)
        .then(response => response.json())
        .then(json => {
            data = loadData(json);
            resolve(data);
        });
}
*/

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
            data = loadData(response.body);
            resolve(data);
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
        let processed_data = chart_results_data["timestamp"]
            .map((time, index) => ({
                date: new Date(time * 1000),
                high: quote_data["high"][index],
                low: quote_data["low"][index],
                open: quote_data["open"][index],
                close: quote_data["close"][index],
                volume: quote_data["volume"][index]
            }));
        return processed_data;
    }
}