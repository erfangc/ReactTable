/**
 * a addon menu item that displays additional text on hover, useful for displaying column definitions
 */
const InfoBox = React.createClass({displayName: "InfoBox",
        propTypes: {
            title: React.PropTypes.string.isRequired,
            text: React.PropTypes.string.isRequired,
            styles: React.PropTypes.object
        },
        getDefaultProps: function () {
            return {
                styles: {
                    "position": "absolute",
                    "whiteSpace": "normal",
                    "width": "250px"
                }
            }
        },
        render: function () {
            return (
                React.createElement("div", {style: {"position": "relative"}, className: "menu-item menu-item-hoverable"}, 
                    React.createElement("div", null, this.props.title), 
                    React.createElement("div", {className: "menu-item-input", style: this.props.styles}, 
                        React.createElement("div", {style: {"display": "block"}}, this.props.text)
                    )
                )
            );
        }
    }
);
