$(function () {
    var columnDefs = [
        {colTag: "first_name", text: "First Name"},
        {
            colTag: "test_score",
            format: "number",
            formatInstructions: "multiplier:1 roundTo:0 unit:%",
            text: "Test Score",
            aggregationMethod: "AVERAGE",
            weightBy: {colTag: "score_weight_factor"},
            cellClassCallback: function (row) {
                var classes = {green: false, red: false};
                classes.green = row.test_score > 50 ? true : false;
                classes.red = row.test_score <= 50 ? true : false;
                return classes;
            }
        },
        {colTag: "score_weight_factor", format: "number", text: "Weight Factor", aggregationMethod: "SUM"}
    ];
    $.get('bower_components/react-table/examples/sample_data.json').success(function (data) {
        var testData = data;
        // first table
        var groupBy = [{colTag: "nationality"}, {colTag: "fruit_preference"}];
        var options = {
            groupBy: groupBy,
            rowKey: 'id',
            data: testData,
            columnDefs: columnDefs,
            beforeColumnAdd: function () {
                console.log("beforeColumnAdd callback called!");
            },
            afterColumnRemove: function (a, b) {
                console.log("Hello There ... you tried to remove " + b.text);
            },
            onSelectCallback: function (row, state) {
                console.log("id = " + row.id + " clicked state:"+state);
            },
            onSummarySelectCallback: function (result, state) {
                console.log(result.summaryRow);
                console.log("Includes "+result.detailRows.length+" detail rows! state:"+state);
            }
        };
        React.render(React.createElement(ReactTable, options), document.getElementById("table"));
    })
})
