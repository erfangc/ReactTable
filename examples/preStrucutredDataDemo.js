$(function () {
    var table;
    $("#add").on('click', function () {
        table.addColumn({colTag: "country", text: "Country"}, 1);
    });
    $.get('pre_structured_data.json').success(function (data) {
        const options = {
            columnDefs: [
                {
                    colTag: "Description",
                    "text": "Description"
                },
                {
                    colTag: "CUSIP",
                    "text": "CUSIP"
                },
                {
                    colTag: "Market Value",
                    "text": "Market Value"
                },
            ],
            dataAsTree: data,
            dataAsTreeTitleKey: "Description",
            subtotalBy: [{colTag: "Description"}]
        };
        table = React.render(React.createElement(ReactTable, options), document.getElementById("table"));
    });
});
