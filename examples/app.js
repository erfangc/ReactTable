$(function () {
    var columnDefs = [
        {colTag: "first_name", text: "First Name"},
        {colTag: "last_name", text: "Last Name"},
        {colTag: "email", text: "Email"},
        {
            colTag: "country", text: "Country",
            sort: function (a, b) {
                return a.country.localeCompare(b.country);
            }
        },
        {
            colTag: "score",
            format: "number",
            formatInstructions: "multiplier:1 roundTo:0 unit:%",
            text: "Score",
            aggregationMethod: "AVERAGE",
            weightBy: {colTag: "weight_factor"},
            cellClassCallback: function (row) {
                var classes = {green: false, red: false};
                classes.green = row.score > 50 ? true : false;
                classes.red = row.score <= 50 ? true : false;
                return classes;
            }
        },
        {colTag: "weight_factor", format: "number", text: "Weight Factor", aggregationMethod: "SUM"}
    ];

    $.get('sample_data.json').success(function (data) {
        var testData = data;
        var groupBy = [{colTag: "last_name"}, {colTag: "country"}];
        var options = {
            groupBy: groupBy,
            rowKey: 'id',
            data: testData,
            columnDefs: columnDefs,
            onSelectCallback: function (row) {
                console.log("id = " + row.id + " clicked");
            },
            beforeColumnAdd: function () {
                console.log("beforeColumnAdd callback called!");
            },
            afterColumnRemove: function (a, b) {
                console.log("Hello There ... you tried to remove " + b.text);
            }
        };
        React.render(React.createElement(ReactTable, options), document.getElementById("table"));
    })
})
