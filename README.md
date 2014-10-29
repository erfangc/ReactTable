# ReactTable

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
data               |[Array of Objects]|the raw data array (Required)
columnDefs         |[Array of Objects]|column definitions on how to construct the headers of the table
groupBy            |[Array of Objects]|columnDefs to dynamically group rows by
afterColumnRemove  |[Function]        |callback to function to invoke after a column has been removed by the user

## Examples

    var options = { data: data, columnDefs: [ {colTag: "first_name", text: "First Name"}, ... ], groupBy: [{colTag: "birth_city"}] };
    React.renderComponent(Table(options), document.getElementById("table"));

    