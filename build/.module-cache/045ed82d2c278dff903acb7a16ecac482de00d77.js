/** @jsx React.DOM */
var Row = React.createClass({displayName: 'Row',
    render: function () {
        var cells = [];
        var firstCell;
        if (this.props.data.isDetail) {
            firstCell = React.DOM.td({key: this.props.data.col1}, this.props.data.col1);
        } else {
            firstCell =
                (
                    React.DOM.td({key: this.props.data.col1}, 
                        React.DOM.a({onClick: this.props.toggleHide.bind(null, this.props.data), className: "btn-link"}, 
                            React.DOM.strong(null, this.props.data.collapsed ? " +" : " -")
                        ), 
                    ' ', 
                        React.DOM.strong(null, this.props.data.col1)
                    )
                );
        }
        cells.push(firstCell);
        cells.push(React.DOM.td({key: this.props.data.col2}, this.props.data.col2));
        return (React.DOM.tr(null, cells));
    }
});
var Table = React.createClass({displayName: 'Table',
    getInitialState: function () {
        return {
            data: this.props.data
        };
    },
    handleHide: function (sectorPath) {
        var newData = [];
        for (var i = 0; i < this.state.data.length; i++) {
            var data = this.state.data[i];
            var shouldHideData = shouldHide(data, sectorPath);
            // do not toggle hidden property if shouldHide() is indifferent between hiding vs. showing
            if (shouldHideData == null)
                data.hidden = data.hidden;
            else if (shouldHideData == true)
                data.hidden = true;
            else
                data.hidden = false;
            newData.push(data);
        }
        return newData;
    },
    handleUnhide: function (sectorPath) {
        var newData = [];
        // hide all rows with parent ~ sectorPath
        for (var i = 0; i < this.state.data.length; i++) {
            var data = this.state.data[i];
            if (isSubSectorOf(data.sectorPath, sectorPath) || sectorPathMatchesExactly(data.sectorPath, sectorPath))
                data.hidden = false;
            newData.push(data);
        }
        return newData;
    },
    handleToggleHide: function (summaryRow) {
        var newData = [];
        if (summaryRow.collapsed) {
            newData = this.handleUnhide(summaryRow.sectorPath);
        } else {
            newData = this.handleHide(summaryRow.sectorPath);
        }
        summaryRow.collapsed = !summaryRow.collapsed;
        this.setState({
            data: newData
        });
    },
    render: function () {
        var unhiddenRows = [];
        // create a array for hidden rows
        for (var i = 0; i < this.state.data.length; i++) {
            var data = this.state.data[i];
            if (!data.hidden)
                unhiddenRows.push(data);
        }
        // only show unhidden rows
        var rows = unhiddenRows.map(function (row) {
            return Row({data: row, key: generateRowKey(row), toggleHide: this.handleToggleHide});
        }, this);
        return (
            React.DOM.table({className: "table table-bordered"}, 
                React.DOM.thead(null, 
                    React.DOM.tr(null, 
                        React.DOM.td(null, "col1"), 
                        React.DOM.td(null, "col2")
                    )
                ), 
                React.DOM.tbody(null, 
                rows
                )
            )
        );
    }
});

/* Utility Functions */
function sectorPathMatchesExactly(sp1, sp2) {
    if (sp1.length != sp2.length)
        return false;
    for (var i = 0; i < sp1.length; i++) {
        if (sp1[i] != sp2[i])
            return false;
    }
    return true;
}
function isSubSectorOf(subSP, superSP) {
    // lower length in SP means higher up on the chain
    if (subSP.length <= superSP.length)
        return false;
    for (var i = 0; i < superSP.length; i++) {
        if (subSP[i] != superSP[i])
            return false;
    }
    return true;
}
function shouldHide(data, sectorPathToHide) {
    var result = null;
    // hide all sub-sectors OR exact sector path matches - except for the summary row
    var sectorPath = data.sectorPath;
    if (isSubSectorOf(sectorPath, sectorPathToHide))
        result = true;
    else if (sectorPathMatchesExactly(sectorPath, sectorPathToHide) && data.isDetail)
        result = true;
    return result;
}
function generateRowKey(row) {
    // row key = sectorPath + values of the row
    var key = row.sectorPath.join("#");
    key += row.col1;
}

// 
function areAncestorsCollapsed(sectorPaths,collapsedSectorPaths) {
}

/*
* a row should be hidden if:
* any of its ancestor is collapsed
* and ... what else?
*
* */