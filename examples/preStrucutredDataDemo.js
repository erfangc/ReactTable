$(function () {
    var table;
    $("#add").on('click', function () {
        table.addColumn({colTag: "country", text: "Country"}, 1);
    });
    $.get('pre_structured_data2.json').success(function (data) {
        const options = {
            columnDefs: [
                {
                    colTag: "title",
                    "text": "title"
                },
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
                }
            ],
            dataAsTree: data,
            dataAsTreeTitleKey: "title",
            subtotalBy: [{colTag: "title"}]
        };
        table = React.render(React.createElement(ReactTable, options), document.getElementById("table"));
    });
});
