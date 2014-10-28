/** @jsx React.DOM */

var RowGroup = React.createClass({displayName: 'Row',
    getInitialState: function () {
        return {
            collapsed: this.props.isCollapsed
        }
    },
    render: function () {
        var masterRowContents = this.props.masterRow.map(function (cell) {
            return React.DOM.td(null, "cell")
        });
        var masterRow = React.DOM.tr(null, masterRowContents)
        return (
            React.DOM.span(null, 
      masterRow, 
      detailRows
            )
        );
    }
});
