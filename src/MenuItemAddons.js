/**
 * a addon menu item that displays additional text on hover, useful for displaying column definitions
 */
const InfoBox = React.createClass({
            propTypes: {
                title: React.PropTypes.string.isRequired,
                text: React.PropTypes.string.isRequired,
                styles: React.PropTypes.object
            },
            getInitialState: function () {
                return {
                    showInfoBox: false
                };
            },
            getDefaultProps: function () {
                return {
                    styles: {
                        "position": "absolute",
                        "whiteSpace": "normal",
                        "top": "100%",
                        "right": "0",
                        "fontSize": "10px",
                        "textShadow": "none",
                        "textAlign": "left",
                        "backgroundColor": "#f0f3f5",
                        "color": "#4a5564",
                        "width": "250px"
                    }
                }
            },
            showInfoBox: function () {
                // determine whether we should show the info box left or right facing, depending on its position in the headers
                this.setState({showInfoBox: true});
            },
            hideInfoBox: function () {
                this.setState({showInfoBox: false});
            }
            ,
            render: function () {
                var infoBox = this.state.showInfoBox ?
                    <div style={this.props.styles}>
                        <div>{this.props.text}</div>
                    </div> : null;

                return (
                    <div style={{"position": "relative"}} className="menu-item" onMouseEnter={this.showInfoBox}
                         onMouseLeave={this.hideInfoBox}>
                        <div>{this.props.title}</div>
                        {infoBox}
                    </div>
                );
            }
        }
    )
    ;
