class MyState {
    constructor() {
        if (!MyState.instance) {
            this.stock_data = {};
            this.selected_stocks = [];
            this.initial_stakes = [];
            this.dates = [];

            this.current_sector = '';
            this.current_category = '';

            this.count = 0;

            MyState.instance = this;
        }
        return MyState.instance;
    }
}