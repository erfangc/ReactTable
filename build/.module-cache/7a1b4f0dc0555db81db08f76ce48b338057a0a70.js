/** @jsx React.DOM */

var RowGroup = React.createClass({displayName: 'Row',
    getInitialState: function () {
        return {
            collapsed: this.props.isCollapsed
        }
    },
    render: function () {
        return (
            React.DOM.span(null, 
      masterRow, 
      detailRows
            )
        );
    }
});
