# ReactTable
**New Project - Not All Features Functional**

HTML Table with Group By functionality Implemented using Facebook [react.js](https://github.com/facebook/react)

(requires [react.js](https://github.com/facebook/react) and [bootstrap](https://github.com/twbs/bootstrap))

Capabilities Include:

- Add/Remove Columns
- Sorting/Custom Sorting
- Row Grouping to Arbitrary Depth
- Automatic Aggregation
- Custom Cell Class Names
- Custom Pagination (When Rows not Grouped)

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

### columnDefs Options
The following properties are valid on objects inside of columnDefs

- colTag : column identifier
- text   : display text in the table header
- format : choose from 'number', 'date' or 'string'
- sort   : custom callback function for sorting the column

## Examples

    var options = { data: data, columnDefs: [ {colTag: "first_name", text: "First Name"}, ... ], groupBy: [{colTag: "birth_city"}] };
    React.renderComponent(Table(options), document.getElementById("table"));

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
