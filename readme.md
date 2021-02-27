# Dataviz A3

Submission from Bradley Ramos and Nicolas Hammer for CS 396: Data Visualization in Winter 2021.

## Installation

For expansive stock selection, we are interacting with the [Yahoo Finance API](https://blog.api.rakuten.net/api-tutorial-yahoo-finance/), which requires the [npm unirest package.](https://www.npmjs.com/package/unirest). For setup, enter the root directory and run:

```bash
npm install unirest
```


## Usage
If you just want to look at the visualization, run the following command and type the address into your chrome browser.
```bash
python3 -m http.server
```


## Contributing
If you would like to make your own changes, install browserify and watchify for automatic re-bundling:
```bash
npm install -g browserify watchify
```
Then, before you start making changes run the following code in a separate terminal:
```bash
watchify chart.js -o bundle.js
```
