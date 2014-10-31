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

### columnDefs Options
The following properties are valid on objects inside of columnDefs

- colTag : column identifier
- text   : display text in the table header
- format : choose from 'number', 'date' or 'string'
- sort   : custom callback function for sorting the column

## Examples

    var options = { data: data, columnDefs: [ {colTag: "first_name", text: "First Name"}, ... ], groupBy: [{colTag: "birth_city"}] };
    React.renderComponent(React.createElement(ReactTable,options, document.getElementById("table"));

## Developing

*You will need [node.js](http://nodejs.org/download/) installed on your development PC in order to use the tools below*

You will first need to download and install [react-tools](http://facebook.github.io/react/docs/tooling-integration.html) by running:

    > npm install -g react-tools

Each time you update source files, you should run the JSX compiler provided as part of react-tools via:

    > jsx ./src ./build
    // assuming your working directory is the project base directory

Alternatively you can automatically perform this by using `jsx --watch` or setup a file watcher in Webstorm

To compile the project run:

    > grunt build
