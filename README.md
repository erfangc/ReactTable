# ReactTable
**New Project - Not All Features Functional**

HTML Table with Group By functionality Implemented using Facebook [react.js](https://github.com/facebook/react)

*requires [react.js](https://github.com/facebook/react)*

Capabilities Include:

- Add/Remove Columns
- Sorting/Custom Sorting
- Row Grouping to Arbitrary Depth
- Automatic Aggregation
- Custom Cell Class Names
- Custom Pagination

## Install

Run the following `bower` command, this will install [react.js](https://github.com/facebook/react) as a dependecy.
Note that **jQuery** is not necessary to use this project

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
selectedRows       |Array of Strings|row keys of initially selected rows, must be used with the 'rowKey' option
rowKey             |String          |specifies the property in the data array that should be used as the unique identifier of the given row for example: `{ssn: xxxx, first_name: "Bob"}; { rowKey: 'ssn'}`

## Table Usage Example

    var options = { data: data, columnDefs: [ {colTag: "first_name", text: "First Name"}, ... ], groupBy: [{colTag: "birth_city"}] };
    React.renderComponent(React.createElement(ReactTable,options, document.getElementById("table"));

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

## Valid `formatInstructions` Options

* multiplier
* roundTo
* unit
* alignment

#### Example
Please note you **cannot** have spaces in the format instruction values, since spaces are used as a separator

    { ..., formatInstructions: "multiplier:100 unit:KG"}

## Developing

*You will need [node.js](http://nodejs.org/download/) installed on your development PC in order to use the tools below*

You will first need to download and install [react-tools](http://facebook.github.io/react/docs/tooling-integration.html) by running:

    > npm install -g react-tools

Each time you update source files, you should run the JSX compiler provided as part of react-tools via:

    > jsx ./src ./build
    // assuming your working directory is the project base directory

Alternatively you can automatically perform this by using `jsx --watch` or setup a file watcher in Webstorm. If you are setting up a file watcher in Webstorm, it may be best to install `react-tools` locally instead of globally, simply remove `-g` from the above `npm` command

To compile the project run:

    > grunt build
