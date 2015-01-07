# ReactTable

High Performance HTML Table with Group By functionality Implemented using Facebook [react.js](https://github.com/facebook/react)

*requires [react.js](https://github.com/facebook/react)*

####Note:
`master` is now on tracking the unreleased version 2 of ReactTable. This version represents the data as a tree instead of a 2D array. There are many benefits. See `legacy-version-1` branch for the old code

[See a Demo Here](http://erfangc.github.io/ReactTable/)

Capabilities Include:
- Able to Handle Large Quantities of Data
- Add/Remove Columns
- Sorting/Custom Sorting
- Row Grouping to Arbitrary Depth
- Automatic/Custom Aggregation
- Custom Cell Class Names
- Pagination
- Multiple Tables
- Custom Formatting Callback
- Drag & Drop Columns (Not Functional)
- Drop a Column to Group (Not Functional)

## Install

Run the following `bower` command, this will install [react.js](https://github.com/facebook/react) and [jQuery](http://jquery.com/download/) as a dependecy.

    > bower install react-table

## Usage

    var options = { ... };
    React.renderComponent(Table(options), document.getElementById("table"));

## Options

Option Name        |Type              |Description
-------------------|------------------|------------
data               |Array of Objects|the raw data array (Required)
columnDefs         |Array of Objects|column definitions on how to construct the headers of the table
groupBy            |Array of Objects|columnDefs to dynamically group rows by
afterColumnRemove  |Function        |callback function to invoke after a column has been removed by the user
beforeColumnAdd    |Function        |callback function to invoke when the "+" button is clicked on the header
onSelectCallback   |Function        |callback function to invoke when a detail row is selected. The selected row will be passed to the callback function as the first argument. The second argument passed will be a boolean representing the selection state of the row that was just clicked on
onSummarySelectCallback|Function    |callback function to invoke when a summary row is selected. The selected row will be passed as the first argument to the callback as an object that contain two properties: `detailRows` which contains detail rows belonging to the given summary row plus the `summaryRow` itself. The second argument passed will be a boolean representing the selection state of the row that was just clicked on
selectedRows       |Array of Strings|row keys of initially selected rows, must be used with the 'rowKey' option
rowKey             |String          |specifies the property in the data array that should be used as the unique identifier of the given row for example: `{ssn: xxxx, first_name: "Bob"}; { rowKey: 'ssn'}`
customMenuItems    |Object          |specifies custom header menu options.  Each key of the given object corresponds to the title of the new menu option and the value is an object e.g. {infoBox: "columnDataPoint"}.  infoBox displays a box whose contents are equal to the columnDef's columnDataPoint on hover of the menu item. As of right now, infoBox is the only supported custom menu object type. This will only appear in columns where columnDataPoint exists in columnDef.

## Table Usage Example
```
var options = { data: data, columnDefs: [ {colTag: "first_name", text: "First Name"}, ... ], groupBy: [{colTag: "birth_city"}], customMenuItems: {Description: {infoBox: "description"}} };
    React.renderComponent(React.createElement(ReactTable,options, document.getElementById("table"));
```

## Possible `columnDefs` Options
The following properties are valid on `columnDef` objects, which are nested under the `columnDefs` array passed to the main table options. These options control the appearance and behaviors of the associated columns.

Column Option Name|Description
-------|------------------
colTag | column identifier
text   | display text in the table header
format | choose from 'number', 'currency', 'date' or 'string'
sort   | custom callback function for sorting the column
cellClassCallback | custom callback for applying custom CSS classes to cells. should should return a object with class names set to true in an object. for example `{ green: true, special: true}`
formatInstructions | a string that represents how you want cells to be formatted, options are
summaryTemplate | a function callback that returns a React Component, this component will be appended to the content of the first column of summary rows. Argument passed: `data` representing the summary row

## Valid `formatInstructions` Options

* multiplier - a number to multiply the cell content by
* roundTo - the number of digits to round to
* unit - text to attach to every cell in the column (such as m, KG, EUR)
* alignment - choose from center, left and right
* separator - set to `true` to turn on comma separator for large numbers

#### Example
Please note you **cannot** have spaces in the format instruction values, since spaces are used as a separator

    { ..., formatInstructions: "multiplier:100 unit:KG"}

## Developing

You will need [node.js](http://nodejs.org/download/) installed on your development PC in order to use the tools below

You will first need to download and install [react-tools](http://facebook.github.io/react/docs/tooling-integration.html) by running:

    > npm install react-tools

Each time you update source files, you should run the JSX compiler provided as part of react-tools via:

    > jsx ./src ./build
    // assuming your working directory is the project base directory

Alternatively you can automatically perform this by using `jsx --watch` or setup a file watcher in Webstorm. If you are setting up a file watcher in Webstorm, it may be best to install `react-tools` locally instead of globally, simply remove `-g` from the above `npm` command

To compile the project run:

    > grunt build
