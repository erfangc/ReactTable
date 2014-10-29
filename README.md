# ReactTable

HTML Table with Group By functionality Implemented using Facebook react.js

Capabilities Include:

- Add/Remove Columns
- Sorting/Custom Sorting
- Row Grouping to Arbitrary Depth

# Usage

    var options = { ... };
    React.renderComponent(Table(options), document.getElementById("table"));

# Options

Option Name        |Type              |Description
-------------------|------------------|------------
data               |[Array of Objects]|the raw data array (Required)
columnDefs         |[Array of Objects]|column definitions on how to construct the headers of the table
groupBy            |[Array of Objects]|columnDefs to dynamically group rows by
afterColumnRemove  |[Function]        |callback to function to invoke after a column has been removed by the user
