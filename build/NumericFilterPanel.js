/** @jsx React.DOM */

var NumericFilterPanel = React.createClass({
    displayName: 'NumericFilterPanel',
    getInitialState: function () {
        return{
            entry0: {
                checked: true,
                dropdown: "gt",
                input: ""
            },
            entry1: {
                checked: false,
                dropdown: "gt",
                input: ""
            }
        };
    },
    handleChange: function(event) {
        var domNode = $(this.getDOMNode());
        var boxes = domNode.find(".rt-numeric-checkbox");
        this.props.clearFilter(this.props.colDef);
        var filterData = [];
        for( var i=0; i<boxes.length; i++ ){
            var tempHash = {};
            var inputBoxData = domNode.find(".rt-numeric-input").eq(i).val();
            var dropdownBoxData = domNode.find(".rt-numeric-dropdown").eq(i).find(":selected").val();
            tempHash[dropdownBoxData] = inputBoxData;

            if( boxes.eq(i).is(":checked") ) {
                filterData.push(tempHash);
                this.state["entry" + i].checked = true;
            }
            else{
                this.state["entry" + i].checked = false;
            }
            this.state["entry" + i].dropdown = dropdownBoxData;
            this.state["entry" + i].input = inputBoxData;
        }
        this.props.addFilter(this.props.colDef, filterData);
        this.setState({entry0: this.state.entry0, entry1: this.state.entry1});
    },
    changeCheckbox: function(e){
        var entryName = "entry" + $(e.target).data("order");
        this.state[entryName].checked = e.target.checked;
        this.setState({entryName: this.state[entryName]});
    },
    render: function () {
        var inputStyle = {
            "width": "70px"
        };
        return (
            React.createElement("div", null, 
                React.createElement("input", {"data-order": "0", className: "rt-numeric-checkbox", type: "checkbox", checked: this.state.entry0.checked, onChange: this.changeCheckbox}), 
                React.createElement("select", {"data-order": "0", className: "rt-numeric-dropdown"}, 
                    React.createElement("option", {value: "gt"}, "Greater Than"), 
                    React.createElement("option", {value: "lt"}, "Less Than"), 
                    React.createElement("option", {value: "eq"}, "Equals")
                ), 
                React.createElement("input", {"data-order": "0", className: "rt-numeric-input", style: inputStyle, type: "number"}), 

                React.createElement("br", null), 

                React.createElement("input", {"data-order": "1", className: "rt-numeric-checkbox", type: "checkbox", checked: this.state.entry1.checked, onChange: this.changeCheckbox}), 
                React.createElement("select", {"data-order": "1", className: "rt-numeric-dropdown"}, 
                    React.createElement("option", {value: "gt"}, "Greater Than"), 
                    React.createElement("option", {value: "lt"}, "Less Than"), 
                    React.createElement("option", {value: "eq"}, "Equals")
                ), 
                React.createElement("input", {"data-order": "1", className: "rt-numeric-input", style: inputStyle, type: "number"}), 

                React.createElement("br", null), 

                React.createElement("button", {onClick: this.handleChange}, "Submit")
            )
        );
    }
});