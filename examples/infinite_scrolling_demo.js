$(function () {
    var table;
    $("#add").on('click', function () {
        table.addColumn({colTag: "country", text: "Country"}, 1);
    });
    $.get('large_data_30k.json').success(function (data) {
        const options = {
            columnDefs: [
                {
                    colTag: "first_name",
                    "text": "First name",
                },
                {
                    colTag: "id",
                    "text": "Row ID",
                    format: "number",
                    formatInstruction: "roundTo:0",
                    customMenuItems: [React.createElement(InfoBox, {title: "Definition", "text": "User's first name!"})]
                },
            ],
            data: data
        };
        table = React.render(React.createElement(ReactTable, options), document.getElementById("table"));
    });
});
