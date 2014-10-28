/** @jsx React.DOM */
var RowGroup = React.createClass({displayName: 'Row',
    getInitialState: function () {
        return {
            isCollapsed: this.props.isCollapsed
        }
    },
    handleClick: function () {
        this.setState({
            isCollapsed: !this.state.isCollapsed
        });
    },
    render: function () {
        // first cell has a "+/-" button
        var masterCollapseButton = (
            React.DOM.td({key: this.props.masterRow[0]}, 
                React.DOM.a({onClick: this.handleClick}, "+"), " ", this.props.masterRow[0]
            ));
        var masterRowContents = this.props.masterRow.slice(1).map(function (cell) {
            return React.DOM.td({key: cell}, cell)
        });
        var masterRow = (
            React.DOM.tr({key: "master"}, 
            masterCollapseButton, 
            masterRowContents
            ));

        // make detail rows
        var detailRows = this.props.detailRows.map(function (row) {
            var rowContents = row.map(function (cell) {
                return React.DOM.td({key: cell}, cell)
            });
            return React.DOM.tr({key: this.props.detailRows.indexOf(row)}, rowContents)
        }, this);
        if (this.state.isCollapsed) {
            return (
                React.DOM.span(null, 
              masterRow
                )
            )
        } else {
            return (
                React.DOM.span(null, 
              masterRow, 
              detailRows
                ))
        }
    }
});

var Table = React.createClass({displayName: 'Table',
    render: function () {
        return (
            React.DOM.table({className: "table table-bordered"}, 
                React.DOM.thead(null, 
                    React.DOM.tr(null, 
                        React.DOM.th(null, "Heading"), 
                        React.DOM.th(null, "Heading")
                    )
                ), 
                React.DOM.tbody(null, 
                    RowGroup({
                        masterRow: this.props.masterRow, 
                        detailRows: this.props.detailRows})
                )
            )
        );
    }
});