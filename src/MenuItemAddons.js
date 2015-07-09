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
                    "top": "150%",
                    "right": "0",
                    "fontSize": "10px",
                    "textShadow": "none",
                    "backgroundColor": "#f0f3f5",
                    "color": "#4a5564",
                    "width": "250px",
                    "padding": "10px",
                    "borderRadius": "1px"
                }
            }
        },
        showInfoBox: function () {
            // determine whether we should show the info box left or right facing, depending on its position in the headers
            this.setState({showInfoBox: true});
        },
        hideInfoBox: function () {
            this.setState({showInfoBox: false});
        },
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
);

/**
 * This component represent a sort menu item that expands into a sub-menu that allow the user to control table sorting
 */
const SubMenu = React.createClass({
    propTypes: {
        subMenu: React.PropTypes.object,
        menuItem: React.PropTypes.object,
        onMenuClick: React.PropTypes.func
    },
    getDefaultProps: function () {
        return {
            onMenuClick: function () {}
        }
    },
    getInitialState: function () {
        return {
            showSubMenu: false
        };
    },
    showSubMenu: function () {
        // determine whether we should show the info box left or right facing, depending on its position in the headers
        this.setState({showSubMenu: true});
    },
    hideSubMenu: function () {
        this.setState({showSubMenu: false});
    },
    render: function () {
        const subMenu = this.state.showSubMenu ?
            this.props.subMenu : null;

        return (
            <div onClick={this.props.onMenuClick} className="menu-item" style={{position:"relative"}}
                 onMouseEnter={this.showSubMenu}
                 onMouseLeave={this.hideSubMenu}>
                {this.props.menuItem}
                {subMenu}
            </div>);
    }
});