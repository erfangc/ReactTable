/** @jsx React.DOM */

var RowGroup = React.createClass({displayName: 'Row',
    getInitialState: function () {
        return {
            collapsed: this.props.isCollapsed
        }
    },
    render: function () {
        // first cell has a "+/-" button
        var masterCollapseButton = React.DOM.td(null, React.DOM.a(null, "+"), "this.props.masterRow[0]");
        var masterRowContents = this.props.masterRow.slice(1).map(function (cell) {
            return React.DOM.td(null, "cell")
        });
        var masterRow = React.DOM.tr(null, masterCollapseButton, masterRowContents)
        return (
            React.DOM.span(null, 
      masterRow, 
      detailRows
            )
        );
    }
});
