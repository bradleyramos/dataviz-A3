# Dataviz A3: Interactive Visualization

Submission from Bradley Ramos and Nicolas Hammer for CS 396: Data Visualization in Winter 2021.

## Installation

For expansive stock selection, we are interacting with the [Yahoo Finance API](https://blog.api.rakuten.net/api-tutorial-yahoo-finance/), which requires the [npm unirest package](https://www.npmjs.com/package/unirest). For setup, enter the root directory and run:

```bash
npm install unirest
```


## Usage
If you just want to look at the visualization, run the following command and type the address into your chrome browser.
```bash
python3 -m http.server
```


## Contributing
If you would like to make your own changes to how our webpage downloads data from the API, install browserify and watchify for automatic re-bundling:
```bash
npm install -g browserify watchify
```
Then, before you start making changes, run the following code in a separate terminal:
```bash
watchify modules/api_data.js -o bundle.js
```
Once you have watchify and your http server running, changes made in api_data.js will automatically re-bundle in bundle.js (which includes the package for API requests) and display on your browser.