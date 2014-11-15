$(function () {
    var $outputArea = $("#outputArea");
    var columnDefs = [
        {colTag: "first_name", text: "First Name"},
        {colTag: "email", text: "Email"},
        {
            colTag: "test_score",
            format: "number",
            formatInstructions: "multiplier:1 roundTo:0 unit:%",
            text: "Test Score",
            aggregationMethod: "_average",
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
                $outputArea.text("beforeColumnAdd callback function called!");
            },
            afterColumnRemove: function (a, b) {
                $outputArea.text("you removed " + b.text);
            },
            onSelectCallback: function (row, state) {
                $outputArea.text("You clicked Row id = " + row.id + ", selection state:" + state);
            },
            onSummarySelectCallback: function (result, state) {
                $outputArea.text("Summary Row = "
                + generateSectorKey(result.sectorPath)
                + " Has " + result.treeNode.ultimateChildren.length
                + " Ultimate Children");
            }
        };
        React.render(React.createElement(ReactTable, options), document.getElementById("table"));
    })
});