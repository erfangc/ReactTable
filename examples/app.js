$(function () {
    var columnDefs = [
        {colTag: "first_name", text: "First Name"},
        {
            colTag: "last_name", text: "Last Name", customMenuItems: function (table, columnDef) {
            return [React.createElement(SummarizeControl, {table: table, columnDef: columnDef})];
        }
        },
        {colTag: "email", text: "Email"},
        {
            colTag: "nationality", text: "Nationality",
            sort: function (a, b) {
                return a.nationality.localeCompare(b.nationality);
            }
        },
        {
            colTag: "superlong",
            text: "Some header"
        },
        {
            colTag: "test_score",
            format: "number",
            formatInstructions: "multiplier:1 roundTo:0 unit:%",
            text: "Test Score",
            groupByRange: [0, 25, 50, 100],
            aggregationMethod: "average",
            weightBy: {colTag: "score_weight_factor"},
            cellClassCallback: function (row) {
                var classes = {green: false, red: false};
                classes.green = row.test_score > 50 ? true : false;
                classes.red = row.test_score <= 50 ? true : false;
                return classes;
            }
        },
        {colTag: "fruit_preference", text: "Fruit Preference"},
        {
            colTag: "score_weight_factor",
            format: "number",
            formatInstructions: "multiplier:1000 separator:true",
            text: "Weight Factor",
            aggregationMethod: "sum"
        }
    ];
    $.get('with_missing_data.json').success(function (data) {
        var testData = data;
        // first table
        var groupBy = [{colTag: "nationality"}, {colTag: "fruit_preference"}];
        var options = {
            groupBy: groupBy,
            rowKey: 'id',
            data: testData,
            height: "300px",
            columnDefs: columnDefs,
            customMenuItems: {
                Description: {
                    infoBox: "formatInstructions"
                }
            },
            beforeColumnAdd: function () {
                console.log("beforeColumnAdd callback called!");
                addMe();
            },
            afterColumnRemove: function (a, b) {
                console.log("Hello There ... you tried to remove " + b.text);
            },
            onSelectCallback: function (row, state) {
                console.log("id = " + row.id + " clicked state:" + state);
            },
            onsummarySelectCallback: function (result, state) {
                console.log(result.summaryRow);
                console.log("Includes " + result.detailRows.length + " detail rows! state:" + state);
            }
        };
        var table1 = React.render(React.createElement(ReactTable, options), document.getElementById("table"));

        function addMe() {
            table1.addColumn({colTag: "currency_used", text: "Currency used"});
        }
    })
})
