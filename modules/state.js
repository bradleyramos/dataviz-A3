class MyState {
    /* Global state variable for webpage instance */
    constructor() {
        if (!MyState.instance) {
            this.stock_data = {}; // all loaded stock data
            this.selected_stocks = []; // stocks currently selected
            this.initial_stakes = []; // initial stakes of portfolio
            this.dates = []; // date range under consideration

            this.current_sector = ''; // current sector under consideration
            this.current_category = ''; // current category  under consideration

            this.count = 0; // number of currently selected stocks

            // Only one instance of MyState may exist at any time
            MyState.instance = this; 
        }
        return MyState.instance;
    }
}