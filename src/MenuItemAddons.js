/**
 * a addon menu item that displays additional text on hover, useful for displaying column definitions
 */
const InfoBox = React.createClass({
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
                <div style={{"position": "relative"}} className="menu-item menu-item-hoverable">
                    <div>{this.props.title}</div>
                    <div className="menu-item-input" style={this.props.styles}>
                        <div style={{"display": "block"}}>{this.props.text}</div>
                    </div>
                </div>
            );
        }
    }
);
