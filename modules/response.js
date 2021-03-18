// Fetch NYSE.json
function getStaticData(resolve, reject) {
    fetch("/static_datasets/NYSE.json")
        .then(response => response.json())
        .then(json => resolve(json));
}

// Filter data by sector name
async function filterBySector(sectorName) {
    let prom = new Promise((resolve, reject) => getStaticData(resolve, reject));
    let staticData = await prom;
    let matched_stocks = staticData.filter(function (entry) {
        return entry.Sector === sectorName;
    });
    if (!matched_stocks.length) alert('Could not fetch that sector.');
    return matched_stocks;
}

// Filter data by category name
async function filterByCategory(cat, sector) {
    let sectorData = await sector;
    let matched;
    switch (cat) {
        case 'Winning':
            matched = sectorData.filter(function (entry) {
                return parseFloat(entry["% Change"]) >= 3;
            });
            break;
        case 'Losing':
            matched = sectorData.filter(function (entry) {
                return parseFloat(entry["% Change"]) <= -3;
            });
            break;
        default:
            matched = sectorData.filter(function (entry) {
                return (parseFloat(entry["% Change"]) == 0);
            });
    }
    if (!matched.length) alert('Could not fetch that sector.');
    // else {
    //   console.log(matched)
    // }
    return matched;
}

// Upon selecteing a stock, do the following
function pushSymbol(evt, sym) {
    if (myState.selected_stocks.includes(sym)) {
        alert('You already added this stock!')
    } 
    else {
        if (myState.count == 4) {
            alert('You can only add 4 stocks at a time!');
        } 
        else {
            // Add stock to active list
            evt.currentTarget.className += " active";
            document.getElementById("selected").innerHTML += "<div class=\"symbol\">" + String(sym) + "</div>";

            // Add element in the stake selector
            document.getElementById("selected-portfolio").innerHTML += "\
                <p class = \"stake-entry\">\
                    <label class=\"portfolio-symbol\" for=\"" + String(sym) + "\">Stake in " + String(sym) + ":&nbsp;&nbsp;</label>\
                    <span style=\"border: 1px inset #ccc;display: inline-block; width: 80%;\">$<input type=\"number\" id=\"" + String(sym) + "\" name=\"" + String(sym) + "\"min=\"0\" max=\"10000\"></span>\
                </p>";

            // Add stock to my stake
            myState.selected_stocks.push(sym);
            myState.count++;

            // Load data through driver() in api_data.js
            window.driver(sym);
        }
    }
}

// Do the following when the "Clear Selected" button is hit
function clearSymbols() {
    myState.count = 0;
    myState.selected_stocks = [];
    tablinks = document.getElementsByClassName("add-button");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Clear the following HTML sections
    document.getElementById("selected").innerHTML = "";
    document.getElementById("chart").innerHTML = "";
    document.getElementById("selected-portfolio").innerHTML = "";
    document.getElementById("results-content").innerHTML = "";
    document.getElementById("chart-2").innerHTML = "";

    // Hide portfolio and results until we've re-zoomed
    document.getElementById("portfolio").style.display = "none";
    document.getElementById("results").style.display = "none";
}

// Perform analysis of portfolio  
function analyzeStocks() {
    // Obtain initial and final takes
    myState.initial_stakes = [];
    let final_stakes = [];
    document.getElementById("results").style.display = "flex";
    for (let i = 0; i < myState.selected_stocks.length; i++) {
        let s = myState.selected_stocks[i];
        let close_data = myState.stock_data[s].map(x => x["close"]);

        let initial_closing = close_data[0];
        let final_closing = close_data[close_data.length - 1];
        let stake = Number(document.getElementById(s).value).toFixed(2);

        myState.initial_stakes.push(stake);
        final_stakes.push((final_closing / initial_closing) * stake);
    }
    console.log('stakes in each stock:', final_stakes);

    // Remove past table
    let results_content = document.getElementById("results-content");
    if (results_content.firstChild) {
        results_content.removeChild(results_content.firstChild);
    }

    // Insert new table
    let table = document.createElement("table");
    table.style.width = "100%";


    // Insert header
    let header = table.insertRow();
    header.insertCell().appendChild(document.createTextNode("Stock"));
    header.insertCell().appendChild(document.createTextNode("Initial Stake"));
    header.insertCell().appendChild(document.createTextNode("Final Stake"));

    // Insert data rows
    for (let i = 0; i < myState.initial_stakes.length; i++) {
        let tr = table.insertRow();

        // Stock name
        let cell1 = tr.insertCell();
        cell1.appendChild(document.createTextNode(myState.selected_stocks[i]));
        cell1.style.border = "1px solid #dddddd";

        // Initial stake
        let cell2 = tr.insertCell();
        cell2.appendChild(document.createTextNode(`$${myState.initial_stakes[i]}`));
        cell2.style.border = "1px solid #dddddd";

        // Final stake
        let cell3 = tr.insertCell();
        cell3.appendChild(document.createTextNode(`$${final_stakes[i].toFixed(2)}`));
        cell3.style.border = "1px solid #dddddd";
    }

    // Apend table to parent
    results_content.appendChild(table);

    // Update chatbot message
    document.getElementById("chat_message").innerHTML = "Here are your results!\
      The graph on the bottom right shows how your portfolio's value changes over 1 year.";
}

// Update filter tabs, based on code from https://www.w3schools.com/howto/howto_js_tabs.asp
async function selectSector(evt, sectorName) {
    var i, tabcontent, tablinks;
    // Get all elements with class="sector-content" and hide them
    tabcontent = document.getElementById("sector-selected").style.display = "flex";
    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    // Show the current tab, and add an "active" class to the button that opened the tab
    // document.getElementById("sector-selected").style.display = "block";
    evt.currentTarget.className += " active";
    // Show the next step
    document.getElementById("sector-selected").style.display = "flex";
    // Update chat bot to indicate the next step.
    document.getElementById("chat_message").innerHTML = "Great! Now decide if you want to know more about\
     stocks that are going up (Winning), undetermined (Constant), or going down (Losing)."
    // document.getElementById("catbutton-win").click();
    myState.current_sector = sectorName;
    if (myState.current_category) {
        // populate stocks
        let filteredData = await filterByCategory(myState.current_category, filterBySector(myState.current_sector));
        let stock;
        document.getElementById(myState.current_category + "List").innerHTML = "";
        for (let x in filteredData) {
            stock = filteredData[x];
            document.getElementById(myState.current_category + "List").innerHTML += "\
                <li class=\"stock\">"
                    + stock.Symbol
                    + "<input class=\"add-button\" type=\"button\" value=\"+\"\
                        onclick=\"pushSymbol(event, \'" + stock.Symbol + "\');\">\
                </li>";
        }
    }
}

// Same function as above but for category
async function selectCat(evt, catName) { 
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("cat-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("catlink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(catName).style.display = "block";
    document.getElementById('stocks-container').style.display = "flex";
    evt.currentTarget.className += " active";
    document.getElementById("chat_message").innerHTML = "You're almost there! Here are the symbols and prices of stocks based on your filters.\
     Select up to 4 stocks that seem interesting to take a look at their historic trends, or refine your search."
    myState.current_category = catName;
    // populate stocks
    let filteredData = await filterByCategory(myState.current_category, filterBySector(myState.current_sector));
    let stock;
    document.getElementById(myState.current_category + "List").innerHTML = "";
    for (let x in filteredData) {
        stock = filteredData[x];
        document.getElementById(myState.current_category + "List").innerHTML += "<li class=\"stock\">"
            + stock.Symbol + "<div>" + stock["Last Sale"] + "</div>"
            + "<input class=\"add-button\" type=\"button\" value=\"+\" onclick=\"pushSymbol(event, \'"
            + stock.Symbol + "\')\"></li>";
    }
}