$(function () {
    var table;
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
            text: "Some header", isLoading: true
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
                classes.green = row.test_score > 50;
                classes.red = row.test_score <= 50;
                return classes;
            }
        },
        {colTag: "fruit_preference", text: "Fruit Preference"},
        {
            colTag: "score_weight_factor",
            format: "number",
            formatInstructions: "multiplier:1000 separator:true showZeroAsBlank:true",
            text: "Weight Factor",
            aggregationMethod: "most_data_points"

        }
    ];
    $("#stop-loading").on('click', function () {
        columnDefs[4].isLoading = false;
        table.setState({});
    });
    $.get('sample_data.json').success(function (data) {
        var testData = data;
        // first table
        var options = {
            disablePagination: true,
            subtotalBy: [{
                colTag: "nationality", text: "Nationality"
            }],
            rowKey: 'id',
            data: testData,
            onRightClick: function (row, event) {
                console.log(row);
                console.log(state);
                event.preventDefault();
            },
            height: "750px",
            sortBy: [{colTag: "score_weight_factor", sortType: 'desc'}],
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
            onSummarySelectCallback: function (result, state) {
                console.log(result);
                console.log(state);
                console.log("Includes " + result.detailRows.length + " detail rows! state:" + state);
            }
        };
        table = React.render(React.createElement(ReactTable, options), document.getElementById("table"));

        function addMe() {
            table.addColumn({colTag: "currency_used", text: "Currency used"});
        }
    })
})
