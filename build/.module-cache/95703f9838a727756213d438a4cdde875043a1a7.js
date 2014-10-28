/** @jsx React.DOM */
var Row = React.createClass({displayName: 'Row',
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
        var renderedDOM = this.props.isMaster ? renderMasterRow(this.props.row) : renderChildRow(this.props.row);
        return renderedDOM;
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
                    "// TODO add rows"
                )
            )
        );
    }
});