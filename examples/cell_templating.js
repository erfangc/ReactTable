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
            cellTemplate: function (content) {
                // this is equivalent to <div><a href='mailto{content.email}'>{content.email}</a> <i class='fa fa-envelope'></i></div>
                return React.createElement("div", {},
                    React.createElement("a", {href: "mailto:" + content.email}, content.email != null ? content.email : ""),
                    " ",
                    content.email != "" ? React.createElement("i", {className: "fa fa-envelope"}) : null
                )
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
    $.get('large_data_30k.json').success(function (data) {
        var options = {
            disablePagination: true,
            rowKey: 'id',
            data: data,
            onRightClick: function (row, column, event) {
                if(true)
                    event.preventDefault();

                console.log(this);
                console.log(a);
                console.log(row);
                console.log(event);
            },
            height: "600px",
            //presort: {score_weight_factor: 'desc'},
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