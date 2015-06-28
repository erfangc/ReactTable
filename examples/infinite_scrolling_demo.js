$(function () {
    $.get('large_data_30k.json').success(function (data) {
        const options = {
            columnDefs: [
                {colTag: "first_name", "text": "First name"},
                {colTag: "id", "text": "Row ID", format: "number", formatInstruction: "roundTo:0"},
                {colTag: "country", "text": "Country"},
            ],
            data: data
        };
        const table = React.render(React.createElement(ReactTable, options), document.getElementById("table"));
    });
});
