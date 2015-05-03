$(function () {
    var columnDefs = [
        {colTag: "first_name", text: "First Name"},
        {
            colTag: "last_name", text: "Last Name", customMenuItems: function (table, columnDef) {
            return [React.createElement(SummarizeControl, {table: table, columnDef: columnDef})];
        }
        },
        {
            colTag: "email", text: "Email",
            onCellSelect: function (cellContent) {
                alert("You selected " + cellContent);
            }
        },
        {
            colTag: "nationality", text: "Nationality",
            sort: function (a, b) {
                return a.nationality.localeCompare(b.nationality);
            }
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
    $.get('sample_data_small.json').success(function (data) {
        var options = {
            disablePagination: true,
            rowKey: 'id',
            data: data,
            onRightClick: function (row, event) {
                console.log(row);
                console.log(state);
                event.preventDefault();
            },
            height: "600px",
            presort: {score_weight_factor: 'desc'},
            columnDefs: columnDefs,
            customMenuItems: {
                Description: {
                    infoBox: "formatInstructions"
                }
            }
        };
        var table = React.render(React.createElement(ReactTable, options), document.getElementById("table"));
    })
});