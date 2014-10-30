$(function () {
    var columnDefs = [
        {colTag: "first_name", text: "First Name"},
        {colTag: "last_name", text: "Last name"},
        {colTag: "email", text: "Email"},
        {colTag: "country", text: "Country"},
        {colTag: "score", format: "number", text: "Score", aggregationMethod: "AVERAGE", weightBy: {colTag: "weight_factor"}},
        {colTag: "weight_factor", format: "number", text: "Weight Factor", aggregationMethod: "SUM"}
    ];

    $.get('sample_data.json').success(function (data) {
        var testData = data;
        React.renderComponent(Table({
            groupBy: [{colTag: "last_name"},{colTag: "country"}],
            data: testData,
            columnDefs: columnDefs,
            beforeColumnAdd: function () {
                alert("beforeColumnAdd callback called!");
            },
            afterColumnRemove: function (a, b) {
                alert("Hello There ... you tried to remove " + b.text);
            }
        }), document.getElementById("table"))
    })
})
