$(function () {
    var columnDefs = [
        {colTag: "first_name", text: "First Name"},
        {
            colTag: "last_name", text: "Last Name"
        },
        {colTag: "email", text: "Email"},
        {
            colTag: "country", text: "Country"
        },
        {
            colTag: "number", text: "Number", format: 'number', aggregationMethod: "_average"
        }
    ];
    $.get('large_data_30k.json').success(function (data) {
        var testData = data;
        var options = {
            rowKey: 'id',
            data: testData,
            groupBy: [{colTag:"country"},{colTag:"last_name"}],
            height: "500px",
            columnDefs: columnDefs,
            beforeColumnAdd: function () {
                console.log("beforeColumnAdd callback called!");
            },
            afterColumnRemove: function (a, b) {
                console.log("Hello There ... you tried to remove " + b.text);
            },
            onSelectCallback: function (row, state) {
                console.log("id = " + row.id + " clicked state:" + state);
            },
            onSummarySelectCallback: function (result, state) {
                console.log(result.summaryRow);
                console.log("Includes " + result.detailRows.length + " detail rows! state:" + state);
            }
        };
        React.render(React.createElement(ReactTable, options), document.getElementById("table"));

    })
})
