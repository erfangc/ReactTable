# ReactTable

High Performance HTML Table with Group By functionality Implemented using Facebook [react.js](https://github.com/facebook/react)

*requires [react.js](https://github.com/facebook/react)*

[See a Demo Here](http://erfang.info/ReactTableDemo/example.html)

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

    > bower install ReactTable

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
onRightClick        |Function       |callback function to invoke when a row is right-clicked.  The first argument is the row clicked on, the second argument is the event.  Use event.preventDefault() (or return false) to prevent the brower's right-click menu to appear
selectedRows       |Array of Strings|row keys of initially selected rows, must be used with the 'rowKey' option
rowKey             |String          |specifies the property in the data array that should be used as the unique identifier of the given row for example: `{ssn: xxxx, first_name: "Bob"}; { rowKey: 'ssn'}`
customMenuItems    |Object          |specifies custom header menu options.  Each key of the given object corresponds to the title of the new menu option and the value is an object e.g. `{infoBox: "columnDataPoint"}`.  `infoBox` displays a box whose contents are equal to the columnDef's columnDataPoint on hover of the menu item. As of right now, infoBox is the only supported custom menu object type. This will only appear in columns where columnDataPoint exists in columnDef.
presort            |Object          |specifies which column to pre-sort a rendered table. Key corresponds to a key in the data object to sort on and whose value is either `asc` or `desc` depending on wheather you would like ascending or descending sorting automatically when the table is rendered. e.g. `{date: 'asc'}`

## Table Usage Example
```js
var options = { 
        data: data, 
        columnDefs: [ {colTag: "first_name", text: "First Name"}, ... ], 
        groupBy: [{colTag: "birth_city"}], customMenuItems: {Description: {infoBox: "description"}} 
    };
    React.renderComponent(React.createElement(ReactTable,options, document.getElementById("table"));
```

## Possible `columnDefs` Options
The following properties are valid on `columnDef` objects, which are nested under the `columnDefs` array passed to the main table options. These options control the appearance and behaviors of the associated columns.

Column Option Name|Description
-------|------------------
colTag | column identifier
conditionalAggregationMethod | changes the aggregation behavior of the column given the current 'groupBy' attribute. Accepts an object where the keys are colTag(s) and values are aggregation methods. ex: `conditionalAggregationMethod: { colA: 'straight_sum', colB: 'average' }` will the sub-total to be computed as a 'average' when grouping by colB and 'straight sum' when grouping by colA
text   | display text in the table header
format | choose from 'number', 'currency', 'date' or 'string'
sort   | custom callback function for sorting the column
reverseSort | custom callback function for sorting the column in reverse (if this is not provided but custom sort is, it will use inverse of custom sort)
cellClassCallback | custom callback for applying custom CSS classes to cells. should should return a object with class names set to true in an object. for example `{ green: true, special: true}`
onCellSelect | custom callback function that triggers when a cell in this column is clicked. `this` is bound to the row component, first argument to the callback is the cell content
formatInstructions | a string that represents how you want cells to be formatted, options are
summaryTemplate | a function callback that returns a React Component, this component will be appended to the content of the first column of summary rows. Argument passed: `data` representing the summary row
cellTemplate | custom callback function provided to the table that returns an React component to be rendered. first argument is the row being rendered
## Valid `formatInstructions` Options

* multiplier - a number to multiply the cell content by
* roundTo - the number of digits to round to
* unit - text to attach to every cell in the column (such as m, KG, EUR)
* alignment - choose from center, left and right
* separator - set to `true` to turn on comma separator for large numbers
* showZeroAsBlank - set to `true` to have cells which equal exactly zero show up as blank in the table

## Functions that can be called on ReactTable object
The following functions can be called on the variable which is returned after rendering a ReactTable.

Function Name|Returns|Description
-------|-------|------------------
toggleSelectDetailRow(key) | undefined | Given a rowKey, toggles the selection of a detail row in the table
toggleSelectSummaryRow(key) | undefined |Given a path rowKey, toggles the selection of a summary row in the table
clearAllRowSelections() | undefined |Clears all detail and summary row selections
getRowSelectionStates() | Object |Returns an object with two entries: One with each of detail and summary row selections
addColumn(columnDef, data) | undefined | Adds (or updates by checking `colTag`) a column to the table. If `data` is passed in, `data` is replaced as the new data object in table
redoPresort() | undefined | Redos the `preSort` from the table definition.
replaceData(data) | undefined | Sets the passed in `data` to be the data object in the table
setStyleByKey(key, styleObj) | undefined | For a given rowKey, sets a detail row to have extra styling per the passed in styleObj.

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
