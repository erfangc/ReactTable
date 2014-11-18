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
            colTag: "number", text: "Number", format: 'number', aggregationMethod: "average"
        }
    ];
    $.get('large_data_30k.json').success(function (data) {
        var testData = data;
        var options = {
            rowKey: 'id',
            data: testData,
            groupBy: [{colTag:"country", text: "Country"},{colTag:"last_name", text: "Last Name"}],
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
            onSummarySelectCallback: function (selectedRow, state) {
                console.log("selectedRow = "+generateSectorKey(selectedRow.sectorPath));
                console.log("Has Ultimate Children: "+selectedRow.treeNode.ultimateChildren.length);
            }
        };
        React.render(React.createElement(ReactTable, options), document.getElementById("table"));

    })
})
